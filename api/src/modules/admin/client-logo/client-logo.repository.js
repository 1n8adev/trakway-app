// SQL queries for client logos. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = 'id, name, image, sort_order, is_active, created_at, updated_at';

// Builds the WHERE clause for list filters: search (name), isActive.
function buildFilters({ search, isActive }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findAll(filters, { limit, offset }) {
  const { where, params } = buildFilters(filters);

  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS}
       FROM client_logos
       ${where}
       ORDER BY sort_order ASC, id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM client_logos ${where}`, params),
  ]);

  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM client_logos WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO client_logos (name, image, sort_order, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [data.name, data.image, data.sort_order, data.is_active],
  );
  return rows[0].id;
}

const UPDATABLE = ['name', 'image', 'sort_order', 'is_active'];

// Updates only the fields present in data.
async function update(id, data) {
  const fields = UPDATABLE.filter((key) => data[key] !== undefined);
  if (!fields.length) return;

  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = fields.map((key) => data[key]);
  params.push(id);

  await db.query(
    `UPDATE client_logos SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
}

async function remove(id) {
  await db.query('DELETE FROM client_logos WHERE id = $1', [id]);
}

module.exports = { findAll, findById, create, update, remove };
