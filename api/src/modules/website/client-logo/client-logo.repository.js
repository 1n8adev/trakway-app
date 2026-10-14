// SQL queries for website client logos. Only this layer talks to the database.
const db = require('../../../config/db');

// Active logos in display order.
async function findActive() {
  const { rows } = await db.query(
    `SELECT id, name, image, sort_order
     FROM client_logos
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows;
}

module.exports = { findActive };
