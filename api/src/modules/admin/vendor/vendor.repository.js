// SQL queries for vendors. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = ['id', 'name', 'contact_person', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'pincode',
  'notes', 'is_active', 'created_at', 'updated_at'];

// Filters: search (name, contact person, mobile, email, GSTIN, city, pincode), state, isActive.
// List rows add invoice_count, total_billed and balance_due (issued invoices only).
async function findAll({ search, state, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(v.name ILIKE ${p} OR v.contact_person ILIKE ${p} OR v.mobile ILIKE ${p} OR v.email ILIKE ${p}
      OR v.gstin ILIKE ${p} OR v.city ILIKE ${p} OR v.pincode ILIKE ${p})`);
  }
  if (state) {
    params.push(state);
    conditions.push(`v.state = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`v.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS.map((c) => `v.${c}`).join(', ')},
         COALESCE(s.invoice_count, 0)::INT AS invoice_count,
         COALESCE(s.total_billed, 0) AS total_billed,
         COALESCE(s.balance_due, 0) AS balance_due
       FROM vendors v
       LEFT JOIN (
         SELECT vendor_id, COUNT(*) AS invoice_count, SUM(grand_total) AS total_billed,
                SUM(GREATEST(grand_total - amount_paid, 0)) AS balance_due
         FROM vendor_invoices WHERE status = 'issued' GROUP BY vendor_id
       ) s ON s.vendor_id = v.id
       ${where}
       ORDER BY v.created_at DESC, v.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM vendors v ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS.join(', ')} FROM vendors WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function gstinExists(gstin, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM vendors WHERE UPPER(gstin) = UPPER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [gstin, excludeId],
  );
  return rows.length > 0;
}

const WRITABLE = ['name', 'contact_person', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'pincode',
  'notes', 'is_active'];

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO vendors (${WRITABLE.join(', ')})
     VALUES (${WRITABLE.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING id`,
    WRITABLE.map((key) => data[key]),
  );
  return rows[0].id;
}

// Updates only the fields present in data.
async function update(id, data) {
  const fields = WRITABLE.filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await db.query(`UPDATE vendors SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

// Invoices of any status.
async function countInvoices(id) {
  const { rows } = await db.query('SELECT COUNT(*) AS total FROM vendor_invoices WHERE vendor_id = $1', [id]);
  return rows[0].total;
}

async function remove(id) {
  await db.query('DELETE FROM vendors WHERE id = $1', [id]);
}

module.exports = { findAll, findById, gstinExists, create, update, countInvoices, remove };
