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

// GET /api/budget — list all budget targets for household
router.get('/', async (req, res) => {
  if (!requireHousehold(req, res)) return;
  const { household_id } = req.dbUser;
  const result = await db.query(
    `SELECT * FROM budget_targets WHERE household_id = $1 ORDER BY category`,
    [household_id]
  );
  res.json(result.rows);
});

// PUT /api/budget/:category — upsert a target
router.put('/:category', async (req, res) => {
  if (!requireHousehold(req, res)) return;
  const { household_id } = req.dbUser;
  const { category } = req.params;
  const { monthly_amount } = req.body;

  if (monthly_amount == null) {
    return res.status(400).json({ error: 'monthly_amount is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO budget_targets (household_id, category, monthly_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (household_id, category)
       DO UPDATE SET monthly_amount = EXCLUDED.monthly_amount
       RETURNING *`,
      [household_id, category, monthly_amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/budget/actuals?start_date=&end_date=
// Returns actuals vs targets for each category
router.get('/actuals', async (req, res) => {
  if (!requireHousehold(req, res)) return;
  const { household_id } = req.dbUser;
  const { start_date, end_date } = req.query;

  try {
    const [targetsResult, actualsResult] = await Promise.all([
      db.query(`SELECT * FROM budget_targets WHERE household_id = $1`, [household_id]),
      db.query(
        `SELECT category, COALESCE(SUM(amount), 0) AS actual
         FROM expenses
         WHERE household_id = $1
           AND hidden = false
           ${start_date ? `AND date >= '${start_date}'` : ''}
           ${end_date ? `AND date <= '${end_date}'` : ''}
         GROUP BY category`,
        [household_id]
      ),
    ]);

    const actualsMap = {};
    for (const row of actualsResult.rows) {
      actualsMap[row.category] = parseFloat(row.actual);
    }

    const combined = targetsResult.rows.map((t) => ({
      category: t.category,
      monthly_amount: parseFloat(t.monthly_amount),
      actual: actualsMap[t.category] || 0,
    }));

    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
