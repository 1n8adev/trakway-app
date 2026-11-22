// SQL queries for suppliers. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = ['id', 'name', 'contact_person', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'pincode',
  'notes', 'is_active', 'created_at', 'updated_at'];

// Filters: search (name, contact person, mobile, email, GSTIN, city, pincode), state, isActive.
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
      `SELECT ${COLUMNS.map((c) => `v.${c}`).join(', ')}
       FROM suppliers v
       ${where}
       ORDER BY v.created_at DESC, v.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM suppliers v ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS.join(', ')} FROM suppliers WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function gstinExists(gstin, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM suppliers WHERE UPPER(gstin) = UPPER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [gstin, excludeId],
  );
  return rows.length > 0;
}

const WRITABLE = ['name', 'contact_person', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'pincode',
  'notes', 'is_active'];

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO suppliers (${WRITABLE.join(', ')})
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
  await db.query(`UPDATE suppliers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

async function remove(id) {
  await db.query('DELETE FROM suppliers WHERE id = $1', [id]);
}

module.exports = { findAll, findById, gstinExists, create, update, remove };
