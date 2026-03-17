const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users/me — return current user profile + household info
router.get('/me', async (req, res) => {
  const user = req.dbUser;

  // Get household members if the user belongs to a household
  let partner = null;
  if (user.household_id) {
    const result = await db.query(
      `SELECT id, name, email FROM users WHERE household_id = $1 AND id != $2`,
      [user.household_id, user.id]
    );
    partner = result.rows[0] || null;
  }

  res.json({ user, partner });
});

// POST /api/users/household — create or join a household
// Body: { action: 'create' } or { action: 'join', household_id: '...' }
router.post('/household', async (req, res) => {
  const { action, household_id } = req.body;
  const user = req.dbUser;

  if (action === 'create') {
    const hh = await db.query(
      `INSERT INTO households DEFAULT VALUES RETURNING *`
    );
    await db.query(`UPDATE users SET household_id = $1 WHERE id = $2`, [
      hh.rows[0].id,
      user.id,
    ]);
    return res.json({ household: hh.rows[0] });
  }

  if (action === 'join') {
    const hh = await db.query(`SELECT * FROM households WHERE id = $1`, [household_id]);
    if (!hh.rows.length) return res.status(404).json({ error: 'Household not found' });

    // Ensure household has < 2 members
    const members = await db.query(
      `SELECT id FROM users WHERE household_id = $1`,
      [household_id]
    );
    if (members.rows.length >= 2) {
      return res.status(400).json({ error: 'Household already has 2 members' });
    }

    await db.query(`UPDATE users SET household_id = $1 WHERE id = $2`, [household_id, user.id]);
    return res.json({ household: hh.rows[0] });
  }

  res.status(400).json({ error: 'Invalid action' });
});

module.exports = router;
