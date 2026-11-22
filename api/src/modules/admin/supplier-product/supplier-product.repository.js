// SQL queries for supplier products. Only this layer talks to the database.
const db = require('../../../config/db');
const { mappingColumns } = require('./supplier-product.mapping');

const COLUMNS = `p.id, p.supplier_id, s.name AS supplier_name, s.is_active AS supplier_is_active,
  ${mappingColumns('p')},
  p.name, p.price, p.hsn_code, p.gst_rate, p.is_active, p.created_at, p.updated_at,
  (SELECT COUNT(DISTINCT pi.purchase_id) FROM purchase_items pi WHERE pi.supplier_product_id = p.id)::INT AS purchase_count,
  (SELECT COALESCE(SUM(pi.quantity), 0) FROM purchase_items pi WHERE pi.supplier_product_id = p.id) AS purchased_quantity`;
const FROM = 'supplier_products p JOIN suppliers s ON s.id = p.supplier_id';

// Filters: supplierId, search (product name, HSN, supplier name), isActive.
async function findAll({ supplierId, search, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (supplierId) {
    params.push(supplierId);
    conditions.push(`p.supplier_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(p.name ILIKE ${p} OR p.hsn_code ILIKE ${p} OR s.name ILIKE ${p})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`p.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM ${FROM} ${where}
       ORDER BY s.name, p.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*)::INT AS total FROM ${FROM} ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM ${FROM} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function findSupplier(id) {
  const { rows } = await db.query('SELECT id, name, is_active FROM suppliers WHERE id = $1', [id]);
  return rows[0] || null;
}

async function nameExists(supplierId, name, excludeId = null) {
  const { rows } = await db.query(
    `SELECT 1 FROM supplier_products
     WHERE supplier_id = $1 AND LOWER(name) = LOWER($2) AND ($3::BIGINT IS NULL OR id <> $3) LIMIT 1`,
    [supplierId, name, excludeId],
  );
  return rows.length > 0;
}

const WRITABLE = ['supplier_id', 'name', 'price', 'hsn_code', 'gst_rate', 'is_active'];

async function create(data) {
  const keys = WRITABLE.filter((key) => data[key] !== undefined);
  const { rows } = await db.query(
    `INSERT INTO supplier_products (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    keys.map((key) => data[key]),
  );
  return rows[0].id;
}

// supplier_id is never updated.
async function update(id, data) {
  const keys = WRITABLE.filter((key) => key !== 'supplier_id' && data[key] !== undefined);
  if (!keys.length) return;
  await db.query(
    `UPDATE supplier_products SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW()
     WHERE id = $${keys.length + 1}`,
    [...keys.map((key) => data[key]), id],
  );
}

async function remove(id) {
  await db.query('DELETE FROM supplier_products WHERE id = $1', [id]);
}

async function countBySupplier(supplierId) {
  const { rows } = await db.query('SELECT COUNT(*)::INT AS total FROM supplier_products WHERE supplier_id = $1', [supplierId]);
  return rows[0].total;
}

module.exports = { findAll, findById, findSupplier, nameExists, create, update, remove, countBySupplier };
