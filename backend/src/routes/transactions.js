const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/transactions/suggestions?q=&type=expense|income|all
// Returns up to 10 distinct description suggestions matching the prefix
router.get('/suggestions', async (req, res) => {
  const { q = '', type = 'all' } = req.query;
  const { household_id } = req.dbUser;

  if (!household_id) {
    return res.status(403).json({ error: 'You must belong to a household first.' });
  }

  // Use contains-match; empty q returns all recent distinct values
  const pattern = q.length > 0 ? `%${q}%` : '%';
  let suggestions = [];

  try {
    if (type === 'expense' || type === 'all') {
      const result = await db.query(
        `SELECT DISTINCT vendor AS description FROM expenses
         WHERE household_id = $1 AND vendor ILIKE $2
         ORDER BY vendor ASC LIMIT 20`,
        [household_id, pattern]
      );
      suggestions.push(...result.rows.map(r => r.description));
    }

    if (type === 'income' || type === 'all') {
      const result = await db.query(
        `SELECT DISTINCT source AS description FROM income
         WHERE household_id = $1 AND source ILIKE $2
         ORDER BY source ASC LIMIT 20`,
        [household_id, pattern]
      );
      suggestions.push(...result.rows.map(r => r.description));
    }

    // Deduplicate and limit to 20
    suggestions = [...new Set(suggestions)].slice(0, 20);

    res.json({ suggestions });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

module.exports = router;
