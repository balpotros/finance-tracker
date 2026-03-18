const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users/me — return current user profile + household info
router.get('/me', async (req, res) => {
  const user = req.dbUser;

  let partner = null;
  let household = null;

  if (user.household_id) {
    const hhResult = await db.query(
      `SELECT id, name FROM households WHERE id = $1`,
      [user.household_id]
    );
    household = hhResult.rows[0] || null;

    const partnerResult = await db.query(
      `SELECT id, name, email, household_role FROM users WHERE household_id = $1 AND id != $2`,
      [user.household_id, user.id]
    );
    partner = partnerResult.rows[0] || null;
  }

  res.json({ user, partner, household });
});

// POST /api/users/household — create, join, or leave a household
router.post('/household', async (req, res) => {
  const { action, household_id, name } = req.body;
  const user = req.dbUser;

  if (action === 'create') {
    const householdName = (name && name.trim()) ? name.trim() : 'My Household';
    const hh = await db.query(
      `INSERT INTO households (name) VALUES ($1) RETURNING *`,
      [householdName]
    );
    await db.query(
      `UPDATE users SET household_id = $1, household_role = 'admin' WHERE id = $2`,
      [hh.rows[0].id, user.id]
    );
    return res.json({ household: hh.rows[0] });
  }

  if (action === 'join') {
    const hh = await db.query(`SELECT * FROM households WHERE id = $1`, [household_id]);
    if (!hh.rows.length) return res.status(404).json({ error: 'Household not found' });

    const members = await db.query(
      `SELECT id FROM users WHERE household_id = $1`,
      [household_id]
    );
    if (members.rows.length >= 2) {
      return res.status(400).json({ error: 'Household already has 2 members' });
    }

    await db.query(
      `UPDATE users SET household_id = $1, household_role = 'member' WHERE id = $2`,
      [household_id, user.id]
    );
    return res.json({ household: hh.rows[0] });
  }

  if (action === 'leave') {
    await db.query(
      `UPDATE users SET household_id = NULL, household_role = NULL WHERE id = $1`,
      [user.id]
    );
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Invalid action' });
});

// PATCH /api/users/household — update household name (admin only)
router.patch('/household', async (req, res) => {
  const { name } = req.body;
  const user = req.dbUser;

  if (!user.household_id) return res.status(400).json({ error: 'Not in a household' });
  if (user.household_role !== 'admin') return res.status(403).json({ error: 'Only admin can rename the household' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  const result = await db.query(
    `UPDATE households SET name = $1 WHERE id = $2 RETURNING *`,
    [name.trim(), user.household_id]
  );
  res.json({ household: result.rows[0] });
});

// PATCH /api/users/me — update display name
router.patch('/me', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await db.query(
      `UPDATE users SET name = $1 WHERE id = $2 RETURNING *`,
      [name.trim(), req.dbUser.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
