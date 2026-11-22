// SQL queries for vendor invoice types. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = `t.id, t.name, t.prefix, t.is_active, t.sort_order, t.created_at, t.updated_at,
  (SELECT COUNT(*) FROM vendor_invoices i WHERE i.type_id = t.id)::INT AS invoice_count`;

async function findAll({ activeOnly = false } = {}) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM vendor_invoice_types t ${activeOnly ? 'WHERE t.is_active = TRUE' : ''}
     ORDER BY t.sort_order, t.id`,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM vendor_invoice_types t WHERE t.id = $1`, [id]);
  return rows[0] || null;
}

async function nameExists(name, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM vendor_invoice_types WHERE LOWER(name) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [name, excludeId],
  );
  return rows.length > 0;
}

async function prefixExists(prefix, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM vendor_invoice_types WHERE UPPER(prefix) = UPPER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [prefix, excludeId],
  );
  return rows.length > 0;
}

// True when some invoice of another type already has a number starting "<prefix>/" (e.g. after a rename).
async function prefixUsedByInvoices(prefix, excludeTypeId = null) {
  const { rows } = await db.query(
    `SELECT 1 FROM vendor_invoices
     WHERE UPPER(split_part(invoice_no, '/', 1)) = UPPER($1) AND ($2::BIGINT IS NULL OR type_id <> $2) LIMIT 1`,
    [prefix, excludeTypeId],
  );
  return rows.length > 0;
}

async function activeCount(excludeId = null) {
  const { rows } = await db.query(
    'SELECT COUNT(*)::INT AS count FROM vendor_invoice_types WHERE is_active = TRUE AND ($1::BIGINT IS NULL OR id <> $1)',
    [excludeId],
  );
  return rows[0].count;
}

// New types go last.
async function create({ name, prefix, is_active = true }) {
  const { rows } = await db.query(
    `INSERT INTO vendor_invoice_types (name, prefix, is_active, sort_order)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM vendor_invoice_types))
     RETURNING id`,
    [name, prefix, is_active],
  );
  return rows[0].id;
}

const WRITABLE = ['name', 'prefix', 'is_active'];

async function update(id, data) {
  const keys = WRITABLE.filter((key) => data[key] !== undefined);
  if (!keys.length) return;
  await db.query(
    `UPDATE vendor_invoice_types SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW()
     WHERE id = $${keys.length + 1}`,
    [...keys.map((key) => data[key]), id],
  );
}

async function remove(id) {
  await db.query('DELETE FROM vendor_invoice_types WHERE id = $1', [id]);
}

module.exports = { findAll, findById, nameExists, prefixExists, prefixUsedByInvoices, activeCount, create, update, remove };
