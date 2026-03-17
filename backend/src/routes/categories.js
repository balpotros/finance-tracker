const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_EXPENSE_CATS = ['Bills','Car','Clothes','Entertainment','Food','Other','Sadaf','Vacation','Self Improve','House','Subscription','Work','Health','Gift'];
const DEFAULT_INCOME_CATS  = ['Job','Tax Refund','Investments','Gift','Other','Bonus'];

// GET /api/categories?type=expense|income
router.get('/', async (req, res) => {
  const { type } = req.query;
  const { household_id } = req.dbUser;
  if (!household_id) return res.json({ expense: DEFAULT_EXPENSE_CATS, income: DEFAULT_INCOME_CATS });

  try {
    const result = await db.query(
      `SELECT type, name FROM categories WHERE household_id = $1 ORDER BY name`,
      [household_id]
    );

    const customExpense = result.rows.filter(r => r.type === 'expense').map(r => r.name);
    const customIncome  = result.rows.filter(r => r.type === 'income').map(r => r.name);

    const expense = [...new Set([...DEFAULT_EXPENSE_CATS, ...customExpense])].sort();
    const income  = [...new Set([...DEFAULT_INCOME_CATS,  ...customIncome])].sort();

    if (type === 'expense') return res.json(expense);
    if (type === 'income')  return res.json(income);
    res.json({ expense, income });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/categories — add a custom category
// Body: { type: 'expense'|'income', name: 'My Category' }
router.post('/', async (req, res) => {
  const { type, name } = req.body;
  const { household_id } = req.dbUser;

  if (!household_id) return res.status(403).json({ error: 'Must belong to a household' });
  if (!['expense','income'].includes(type)) return res.status(400).json({ error: 'type must be expense or income' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    await db.query(
      `INSERT INTO categories (household_id, type, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [household_id, type, name.trim()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/categories — remove a custom category
// Body: { type: 'expense'|'income', name: 'My Category' }
router.delete('/', async (req, res) => {
  const { type, name } = req.body;
  const { household_id } = req.dbUser;

  if (!household_id) return res.status(403).json({ error: 'Must belong to a household' });

  // Only allow deleting custom categories (not defaults)
  const defaults = type === 'expense' ? DEFAULT_EXPENSE_CATS : DEFAULT_INCOME_CATS;
  if (defaults.includes(name)) return res.status(400).json({ error: 'Cannot delete a default category' });

  try {
    await db.query(
      `DELETE FROM categories WHERE household_id = $1 AND type = $2 AND name = $3`,
      [household_id, type, name]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
module.exports.DEFAULT_EXPENSE_CATS = DEFAULT_EXPENSE_CATS;
module.exports.DEFAULT_INCOME_CATS  = DEFAULT_INCOME_CATS;
