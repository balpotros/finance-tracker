const express = require('express');
const router = express.Router();
const db = require('../db');

function requireHousehold(req, res) {
  if (!req.dbUser.household_id) {
    res.status(403).json({ error: 'You must belong to a household first.' });
    return false;
  }
  return true;
}

// GET /api/dashboard/summary?start_date=&end_date=
router.get('/summary', async (req, res) => {
  if (!requireHousehold(req, res)) return;
  const { household_id } = req.dbUser;
  const { start_date, end_date } = req.query;

  const dateFilter = (col) => {
    const parts = [];
    if (start_date) parts.push(`AND ${col} >= '${start_date}'`);
    if (end_date)   parts.push(`AND ${col} <= '${end_date}'`);
    return parts.join(' ');
  };

  try {
    const [incomeRes, expenseRes, expByCatRes, recentRes, monthlyRes] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM income
         WHERE household_id=$1 AND hidden=false ${dateFilter('date')}`,
        [household_id]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE household_id=$1 AND hidden=false ${dateFilter('date')}`,
        [household_id]
      ),
      db.query(
        `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE household_id=$1 AND hidden=false ${dateFilter('date')}
         GROUP BY category ORDER BY total DESC`,
        [household_id]
      ),
      db.query(
        `SELECT e.*, u.name AS user_name, 'expense' AS type FROM expenses e
         JOIN users u ON u.id=e.user_id
         WHERE e.household_id=$1 AND e.hidden=false ${dateFilter('e.date')}
         UNION ALL
         SELECT i.id, i.household_id, i.user_id, i.date, i.source AS vendor,
                i.amount, i.category, i.notes, i.hidden, i.created_at, u.name AS user_name, 'income' AS type
         FROM income i
         JOIN users u ON u.id=i.user_id
         WHERE i.household_id=$1 AND i.hidden=false ${dateFilter('i.date')}
         ORDER BY date DESC, created_at DESC LIMIT 10`,
        [household_id]
      ),
      db.query(
        `SELECT
           TO_CHAR(date, 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
           COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses
         FROM (
           SELECT date, amount, 'income' AS type FROM income
           WHERE household_id=$1 AND hidden=false ${dateFilter('date')}
           UNION ALL
           SELECT date, amount, 'expense' AS type FROM expenses
           WHERE household_id=$1 AND hidden=false ${dateFilter('date')}
         ) combined
         GROUP BY month ORDER BY month`,
        [household_id]
      ),
    ]);

    const totalIncome   = parseFloat(incomeRes.rows[0].total);
    const totalExpenses = parseFloat(expenseRes.rows[0].total);
    const totalSavings  = totalIncome - totalExpenses;
    const savingsRate   = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    res.json({
      summary: { totalIncome, totalExpenses, totalSavings, savingsRate },
      expensesByCategory: expByCatRes.rows,
      recentTransactions: recentRes.rows,
      monthly: monthlyRes.rows.map((r) => ({
        month: r.month,
        income: parseFloat(r.income),
        expenses: parseFloat(r.expenses),
        savings: parseFloat(r.income) - parseFloat(r.expenses),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/dashboard/compare?period1_start=&period1_end=&period2_start=&period2_end=
router.get('/compare', async (req, res) => {
  if (!requireHousehold(req, res)) return;
  const { household_id } = req.dbUser;
  const { period1_start, period1_end, period2_start, period2_end } = req.query;

  async function getPeriodData(start, end) {
    const [incomeRes, expenseRes, expByCatRes, incByCatRes] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM income
         WHERE household_id=$1 AND hidden=false AND date >= $2 AND date <= $3`,
        [household_id, start, end]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE household_id=$1 AND hidden=false AND date >= $2 AND date <= $3`,
        [household_id, start, end]
      ),
      db.query(
        `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE household_id=$1 AND hidden=false AND date >= $2 AND date <= $3
         GROUP BY category`,
        [household_id, start, end]
      ),
      db.query(
        `SELECT category, COALESCE(SUM(amount),0) AS total FROM income
         WHERE household_id=$1 AND hidden=false AND date >= $2 AND date <= $3
         GROUP BY category`,
        [household_id, start, end]
      ),
    ]);

    const totalIncome   = parseFloat(incomeRes.rows[0].total);
    const totalExpenses = parseFloat(expenseRes.rows[0].total);
    return {
      totalIncome,
      totalExpenses,
      totalSavings: totalIncome - totalExpenses,
      expensesByCategory: expByCatRes.rows,
      incomeByCategory: incByCatRes.rows,
    };
  }

  try {
    const [period1, period2] = await Promise.all([
      getPeriodData(period1_start, period1_end),
      getPeriodData(period2_start, period2_end),
    ]);
    res.json({ period1, period2 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
