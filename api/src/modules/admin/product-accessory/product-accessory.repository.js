// SQL queries for product accessories. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = `a.id, a.name, a.price, a.hsn_code, a.gst_rate, a.is_active, a.created_at, a.updated_at,
  (SELECT COUNT(DISTINCT it.invoice_id) FROM vendor_invoice_items it WHERE it.accessory_id = a.id)::INT AS invoice_count`;

// Filters: search (name, HSN), isActive.
async function findAll({ search, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(a.name ILIKE $${params.length} OR a.hsn_code ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`a.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM product_accessories a ${where}
       ORDER BY a.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*)::INT AS total FROM product_accessories a ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM product_accessories a WHERE a.id = $1`, [id]);
  return rows[0] || null;
}

async function nameExists(name, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM product_accessories WHERE LOWER(name) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [name, excludeId],
  );
  return rows.length > 0;
}

const WRITABLE = ['name', 'price', 'hsn_code', 'gst_rate', 'is_active'];

async function create(data) {
  const keys = WRITABLE.filter((key) => data[key] !== undefined);
  const { rows } = await db.query(
    `INSERT INTO product_accessories (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    keys.map((key) => data[key]),
  );
  return rows[0].id;
}

async function update(id, data) {
  const keys = WRITABLE.filter((key) => data[key] !== undefined);
  if (!keys.length) return;
  await db.query(
    `UPDATE product_accessories SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW()
     WHERE id = $${keys.length + 1}`,
    [...keys.map((key) => data[key]), id],
  );
}

async function remove(id) {
  await db.query('DELETE FROM product_accessories WHERE id = $1', [id]);
}

module.exports = { findAll, findById, nameExists, create, update, remove };
