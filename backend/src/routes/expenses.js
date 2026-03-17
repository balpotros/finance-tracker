const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: ensure user belongs to a household
function requireHousehold(req, res) {
  if (!req.dbUser.household_id) {
    res.status(403).json({ error: 'You must belong to a household first.' });
    return false;
  }
  return true;
}

// GET /api/expenses
// Query params: start_date, end_date, category, search, sort_by, sort_dir
router.get('/', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { start_date, end_date, category, search, sort_by = 'date', sort_dir = 'desc' } = req.query;
  const { household_id } = req.dbUser;

  const allowedSort = ['date', 'amount', 'category', 'vendor'];
  const col = allowedSort.includes(sort_by) ? sort_by : 'date';
  const dir = sort_dir === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['e.household_id = $1'];
  const params = [household_id];
  let p = 2;

  if (start_date) { conditions.push(`e.date >= $${p++}`); params.push(start_date); }
  if (end_date)   { conditions.push(`e.date <= $${p++}`); params.push(end_date); }
  if (category)   { conditions.push(`e.category = $${p++}`); params.push(category); }
  if (search)     { conditions.push(`e.vendor ILIKE $${p++}`); params.push(`%${search}%`); }

  const sql = `
    SELECT e.*, u.name AS user_name
    FROM expenses e
    JOIN users u ON u.id = e.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.${col} ${dir}, e.created_at DESC
  `;

  try {
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { date, vendor, amount, category, notes, hidden } = req.body;
  const { id: user_id, household_id } = req.dbUser;

  if (!date || !vendor || amount == null || !category) {
    return res.status(400).json({ error: 'date, vendor, amount, category are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO expenses (household_id, user_id, date, vendor, amount, category, notes, hidden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [household_id, user_id, date, vendor, amount, category, notes || null, hidden || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { id } = req.params;
  const { id: user_id } = req.dbUser;
  const { date, vendor, amount, category, notes, hidden } = req.body;

  // Ownership check
  const existing = await db.query(`SELECT * FROM expenses WHERE id = $1`, [id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
  if (existing.rows[0].user_id !== user_id) {
    return res.status(403).json({ error: 'You can only edit your own expenses' });
  }

  try {
    const result = await db.query(
      `UPDATE expenses SET date=$1, vendor=$2, amount=$3, category=$4, notes=$5, hidden=$6
       WHERE id=$7 RETURNING *`,
      [date, vendor, amount, category, notes || null, hidden || false, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { id } = req.params;
  const { id: user_id } = req.dbUser;

  const existing = await db.query(`SELECT * FROM expenses WHERE id = $1`, [id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
  if (existing.rows[0].user_id !== user_id) {
    return res.status(403).json({ error: 'You can only delete your own expenses' });
  }

  await db.query(`DELETE FROM expenses WHERE id = $1`, [id]);
  res.status(204).end();
});

module.exports = router;
