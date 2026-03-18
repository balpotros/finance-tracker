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

// GET /api/income
router.get('/', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { start_date, end_date, category, search, sort_by = 'date', sort_dir = 'desc' } = req.query;
  const { household_id } = req.dbUser;

  const allowedSort = ['date', 'amount', 'category', 'source'];
  const col = allowedSort.includes(sort_by) ? sort_by : 'date';
  const dir = sort_dir === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['i.household_id = $1'];
  const params = [household_id];
  let p = 2;

  if (start_date) { conditions.push(`i.date >= $${p++}`); params.push(start_date); }
  if (end_date)   { conditions.push(`i.date <= $${p++}`); params.push(end_date); }
  if (category)   { conditions.push(`i.category = $${p++}`); params.push(category); }
  if (search)     { conditions.push(`i.source ILIKE $${p++}`); params.push(`%${search}%`); }

  const sql = `
    SELECT i.*, u.name AS user_name
    FROM income i
    JOIN users u ON u.id = i.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.${col} ${dir}, i.created_at DESC
  `;

  try {
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/income
router.post('/', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { date, source, amount, category, notes, hidden } = req.body;
  const { id: user_id, household_id } = req.dbUser;

  if (!date || !source || amount == null || !category) {
    return res.status(400).json({ error: 'date, source, amount, category are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO income (household_id, user_id, date, source, amount, category, notes, hidden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [household_id, user_id, date, source, amount, category, notes || null, hidden || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/income/:id
router.put('/:id', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { id } = req.params;
  const { id: user_id } = req.dbUser;
  const { date, source, amount, category, notes, hidden } = req.body;

  const existing = await db.query(`SELECT * FROM income WHERE id = $1`, [id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
  if (existing.rows[0].user_id !== user_id) {
    return res.status(403).json({ error: 'You can only edit your own income entries' });
  }

  try {
    const result = await db.query(
      `UPDATE income SET date=$1, source=$2, amount=$3, category=$4, notes=$5, hidden=$6
       WHERE id=$7 RETURNING *`,
      [date, source, amount, category, notes || null, hidden || false, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/income/:id
router.delete('/:id', async (req, res) => {
  if (!requireHousehold(req, res)) return;

  const { id } = req.params;
  const { id: user_id } = req.dbUser;

  const existing = await db.query(`SELECT * FROM income WHERE id = $1`, [id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
  if (existing.rows[0].user_id !== user_id) {
    return res.status(403).json({ error: 'You can only delete your own income entries' });
  }

  await db.query(`DELETE FROM income WHERE id = $1`, [id]);
  res.status(204).end();
});

module.exports = router;
