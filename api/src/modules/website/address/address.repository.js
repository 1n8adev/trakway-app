// SQL queries for customer addresses. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = `id, name, phone, address_line1, address_line2, landmark, city, state, pincode,
  is_default, created_at, updated_at`;
const FIELDS = ['name', 'phone', 'address_line1', 'address_line2', 'landmark', 'city', 'state', 'pincode'];

// Default first, then newest.
async function findByUser(userId) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC, id DESC`,
    [userId],
  );
  return rows;
}

async function findOne(userId, id, client = db.pool) {
  const { rows } = await client.query(`SELECT ${COLUMNS} FROM user_addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] || null;
}

async function countByUser(userId) {
  const { rows } = await db.query('SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = $1', [userId]);
  return rows[0].total;
}

async function create(userId, data, client) {
  const { rows } = await client.query(
    `INSERT INTO user_addresses (user_id, ${FIELDS.join(', ')}, is_default)
     VALUES ($1, ${FIELDS.map((_, i) => `$${i + 2}`).join(', ')}, $${FIELDS.length + 2}) RETURNING id`,
    [userId, ...FIELDS.map((key) => data[key] ?? null), data.is_default],
  );
  return rows[0].id;
}

// Updates only the fields present in data.
async function update(id, data, client) {
  const fields = FIELDS.filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await client.query(`UPDATE user_addresses SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

// Makes `id` the user's only default address.
async function setDefault(userId, id, client) {
  await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1 AND is_default AND id <> $2', [userId, id]);
  await client.query('UPDATE user_addresses SET is_default = TRUE, updated_at = NOW() WHERE id = $1', [id]);
}

async function remove(id, client) {
  await client.query('DELETE FROM user_addresses WHERE id = $1', [id]);
}

// Newest remaining address (to become the default after the default is deleted).
async function findNewestId(userId, client) {
  const { rows } = await client.query(
    'SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1',
    [userId],
  );
  return rows[0]?.id ?? null;
}

module.exports = { FIELDS, findByUser, findOne, countByUser, create, update, setDefault, remove, findNewestId };
