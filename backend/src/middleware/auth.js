const { auth } = require('express-oauth2-jwt-bearer');
const db = require('../db');
const https = require('https');

// Validate JWT from Auth0
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});

// Fetch user profile from Auth0 /userinfo endpoint using the access token
async function getUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: process.env.AUTH0_DOMAIN,
      path: '/userinfo',
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function isRealName(name) {
  if (!name) return false;
  if (name.startsWith('google-oauth2')) return false;
  if (name.includes('@auth0.local')) return false;
  if (name.includes('|')) return false;
  return true;
}

// Attach the local user record to req.user
async function attachUser(req, res, next) {
  try {
    const sub = req.auth.payload.sub;
    let email = req.auth.payload[`https://finance-tracker/email`] || req.auth.payload.email;
    let name  = req.auth.payload[`https://finance-tracker/name`]  || req.auth.payload.name;
    let picture = req.auth.payload.picture;

    // Always fetch /userinfo to get real name/email (works without Management API permissions)
    try {
      const rawToken = req.headers.authorization?.split(' ')[1];
      if (rawToken) {
        const profile = await getUserInfo(rawToken);
        email   = profile.email   || email;
        name    = profile.name    || profile.nickname || name;
        picture = profile.picture || picture;
      }
    } catch (e) {
      console.warn('Could not fetch /userinfo:', e.message);
    }

    // Final fallbacks
    if (!email) email = `${sub.replace(/[|]/g, '-')}@auth0.local`;
    if (!name)  name  = email.split('@')[0];

    // Upsert user — always update with the best data we have
    const result = await db.query(
      `INSERT INTO users (auth0_sub, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth0_sub) DO UPDATE
         SET email   = CASE WHEN EXCLUDED.email NOT LIKE '%@auth0.local' THEN EXCLUDED.email ELSE users.email END,
             name    = CASE WHEN $5 THEN EXCLUDED.name ELSE users.name END,
             picture = COALESCE(EXCLUDED.picture, users.picture)
       RETURNING *`,
      [sub, email, name, picture || null, isRealName(name)]
    );

    req.dbUser = result.rows[0];
    next();
  } catch (err) {
    console.error('attachUser error:', err);
    res.status(500).json({ error: 'Failed to resolve user' });
  }
}

module.exports = { checkJwt, attachUser };
