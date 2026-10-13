// SQL queries for website FAQs. Only this layer talks to the database.
const db = require('../../../config/db');

// Active FAQs in display order.
async function findActive() {
  const { rows } = await db.query(
    'SELECT id, question, answer FROM faqs WHERE is_active ORDER BY sort_order, id',
  );
  return rows;
}

module.exports = { findActive };
