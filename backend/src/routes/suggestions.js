const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/suggestions?type=expense|income
router.get('/', async (req, res) => {
  const { type } = req.query;
  if (!req.dbUser.household_id) {
    return res.status(403).json({ error: 'You must belong to a household first.' });
  }
  const { household_id } = req.dbUser;

  try {
    let result;
    if (type === 'expense') {
      result = await db.query(
        `SELECT DISTINCT vendor AS description
         FROM expenses
         WHERE household_id = $1 AND vendor IS NOT NULL AND vendor <> ''
         ORDER BY vendor ASC`,
        [household_id]
      );
    } else if (type === 'income') {
      result = await db.query(
        `SELECT DISTINCT source AS description
         FROM income
         WHERE household_id = $1 AND source IS NOT NULL AND source <> ''
         ORDER BY source ASC`,
        [household_id]
      );
    } else {
      return res.status(400).json({ error: 'type must be "expense" or "income"' });
    }

    res.json(result.rows.map(r => r.description));
  } catch (err) {
    console.error('suggestions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
