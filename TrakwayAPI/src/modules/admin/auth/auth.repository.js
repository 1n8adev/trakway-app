// SQL queries for admin auth. Only this layer talks to the database.
const db = require('../../../config/db');

async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT id, name, email, password_hash, is_active
     FROM admin_users
     WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, name, email, is_active, last_login_at, created_at
     FROM admin_users
     WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function updateLastLogin(id) {
  await db.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [id]);
}

module.exports = { findByEmail, findById, updateLastLogin };
