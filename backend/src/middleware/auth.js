const { auth } = require('express-oauth2-jwt-bearer');
const db = require('../db');

// Validate JWT from Auth0
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});

// Attach the local user record to req.user
async function attachUser(req, res, next) {
  try {
    const sub = req.auth.payload.sub;
    const email = req.auth.payload[`https://finance-tracker/email`] || req.auth.payload.email;
    const name = req.auth.payload[`https://finance-tracker/name`] || req.auth.payload.name || email;

    // Upsert user
    const result = await db.query(
      `INSERT INTO users (auth0_sub, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (auth0_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
       RETURNING *`,
      [sub, email, name]
    );

    req.dbUser = result.rows[0];
    next();
  } catch (err) {
    console.error('attachUser error:', err);
    res.status(500).json({ error: 'Failed to resolve user' });
  }
}

module.exports = { checkJwt, attachUser };
