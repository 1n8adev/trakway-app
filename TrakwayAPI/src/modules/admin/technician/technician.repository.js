// SQL queries for technicians. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = `id, name, mobile, email, address, state, pincode,
  technician_photo, shop_photo, id_proof_photo, is_active, created_at, updated_at`;

// Filters: search (name, mobile, email, pincode), state, isActive.
async function findAll({ search, state, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(name ILIKE ${p} OR mobile ILIKE ${p} OR email ILIKE ${p} OR pincode ILIKE ${p})`);
  }
  if (state) {
    params.push(state);
    conditions.push(`state = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS},
         (SELECT COUNT(*) FROM service_bookings sb
           WHERE sb.technician_id = technicians.id AND sb.status = 'assigned') AS open_jobs
       FROM technicians ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM technicians ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM technicians WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function mobileExists(mobile, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM technicians WHERE mobile = $1 AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [mobile, excludeId],
  );
  return rows.length > 0;
}

async function emailExists(email, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM technicians WHERE LOWER(email) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [email, excludeId],
  );
  return rows.length > 0;
}

const WRITABLE = ['name', 'mobile', 'email', 'address', 'state', 'pincode',
  'technician_photo', 'shop_photo', 'id_proof_photo', 'is_active'];

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO technicians (${WRITABLE.join(', ')})
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
  await db.query(`UPDATE technicians SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

// Bookings (any status) assigned to this technician.
async function countBookings(id) {
  const { rows } = await db.query('SELECT COUNT(*) AS total FROM service_bookings WHERE technician_id = $1', [id]);
  return rows[0].total;
}

async function remove(id) {
  await db.query('DELETE FROM technicians WHERE id = $1', [id]);
}

module.exports = { findAll, findById, mobileExists, emailExists, create, update, countBookings, remove };
