// SQL queries for admin settings. Only this layer talks to the database.
const db = require('../../../config/db');

// { key: { value, updated_at, updated_by_name } } for the keys that have been saved.
async function findMany(keys) {
  const { rows } = await db.query(
    `SELECT s.key, s.value, s.updated_at, a.name AS updated_by_name
     FROM app_settings s LEFT JOIN admin_users a ON a.id = s.updated_by
     WHERE s.key = ANY($1::TEXT[])`,
    [keys],
  );
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}

async function findValue(key) {
  const { rows } = await db.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return rows.length ? rows[0].value : undefined;
}

async function upsert(key, value, adminId) {
  await db.query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [key, value, adminId],
  );
}

// Back to the built-in default.
async function remove(key) {
  await db.query('DELETE FROM app_settings WHERE key = $1', [key]);
}

module.exports = { findMany, findValue, upsert, remove };
