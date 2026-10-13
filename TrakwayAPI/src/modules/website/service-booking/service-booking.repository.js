// SQL queries for website service bookings. Only this layer talks to the database.
const db = require('../../../config/db');

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO service_bookings
       (vehicle_type, service, preferred_date, preferred_time, name, email, phone, address, pincode, state, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING 'SB-' || LPAD(id::TEXT, 6, '0') AS booking_no, preferred_date, preferred_time, service, status`,
    [data.vehicle_type, data.service, data.preferred_date, data.preferred_time, data.name, data.email,
      data.phone, data.address, data.pincode, data.state, data.ip_address],
  );
  return rows[0];
}

module.exports = { create };
