// SQL queries for service bookings (admin). Only this layer talks to the database.
const db = require('../../../config/db');

// b = service_bookings, t = assigned technician (may be null).
const COLUMNS = `b.id, 'SB-' || LPAD(b.id::TEXT, 6, '0') AS booking_no, b.vehicle_type, b.service, b.preferred_date,
  b.preferred_time, b.name, b.email, b.phone, b.address, b.pincode, b.state, b.status, b.admin_notes,
  b.technician_id, t.name AS technician_name, t.mobile AS technician_mobile, t.pincode AS technician_pincode,
  t.state AS technician_state, t.technician_photo AS technician_photo, t.is_active AS technician_is_active,
  b.assigned_at, b.completed_at, b.created_at, b.updated_at`;
const FROM = 'service_bookings b LEFT JOIN technicians t ON t.id = b.technician_id';

// Builds the WHERE clause: status, service, vehicleType, technicianId, dateFrom/dateTo (preferred_date), search.
function buildFilters({ status, service, vehicleType, technicianId, dateFrom, dateTo, search }) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (status) add('b.status = ?', status);
  if (service) add('b.service = ?', service);
  if (vehicleType) add('b.vehicle_type = ?', vehicleType);
  if (technicianId) add('b.technician_id = ?', technicianId);
  if (dateFrom) add('b.preferred_date >= ?', dateFrom);
  if (dateTo) add('b.preferred_date <= ?', dateTo);
  if (search) {
    // "SB-000012" / "sb12" search by booking number; otherwise name, phone, email, pincode.
    const bookingId = /^sb-?0*(\d+)$/i.exec(search);
    if (bookingId) {
      add('b.id = ?', Number(bookingId[1]));
    } else {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      conditions.push(`(b.name ILIKE ${p} OR b.phone ILIKE ${p} OR b.email ILIKE ${p} OR b.pincode ILIKE ${p})`);
    }
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findAll(filters, { limit, offset }) {
  const { where, params } = buildFilters(filters);
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM ${FROM} ${where}
       ORDER BY b.created_at DESC, b.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM service_bookings b ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

// Number of bookings per status (for the Open / Assigned / Completed tabs).
async function countByStatus() {
  const { rows } = await db.query('SELECT status, COUNT(*) AS total FROM service_bookings GROUP BY status');
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM ${FROM} WHERE b.id = $1`, [id]);
  return rows[0] || null;
}

async function findTechnician(id) {
  const { rows } = await db.query('SELECT id, name, is_active FROM technicians WHERE id = $1', [id]);
  return rows[0] || null;
}

// Active technicians for a booking, nearest first:
//   'pincode' same pincode -> 'area' same first 3 pincode digits -> 'state' same state -> 'other';
// within a group, fewer open jobs (their bookings in status "assigned") first.
async function findTechnicianSuggestions({ pincode, state }, { limit, search }) {
  const params = [pincode, state];
  let searchSql = '';
  if (search) {
    params.push(`%${search}%`);
    searchSql = `AND (t.name ILIKE $${params.length} OR t.mobile ILIKE $${params.length} OR t.pincode ILIKE $${params.length})`;
  }
  params.push(limit);
  const { rows } = await db.query(
    `SELECT * FROM (
       SELECT t.id, t.name, t.mobile, t.pincode, t.state, t.technician_photo, t.is_active,
         CASE WHEN t.pincode = $1 THEN 'pincode'
              WHEN LEFT(t.pincode, 3) = LEFT($1, 3) THEN 'area'
              WHEN t.state = $2 THEN 'state'
              ELSE 'other' END AS match,
         (SELECT COUNT(*) FROM service_bookings sb WHERE sb.technician_id = t.id AND sb.status = 'assigned') AS open_jobs
       FROM technicians t
       WHERE t.is_active ${searchSql}
     ) s
     ORDER BY CASE s.match WHEN 'pincode' THEN 0 WHEN 'area' THEN 1 WHEN 'state' THEN 2 ELSE 3 END, s.open_jobs, s.name
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

// Updates only the given fields.
async function update(id, data) {
  const fields = ['status', 'technician_id', 'admin_notes', 'assigned_at', 'completed_at']
    .filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await db.query(
    `UPDATE service_bookings SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
}

async function remove(id) {
  await db.query('DELETE FROM service_bookings WHERE id = $1', [id]);
}

module.exports = {
  findAll, countByStatus, findById, findTechnician, findTechnicianSuggestions, update, remove,
};
