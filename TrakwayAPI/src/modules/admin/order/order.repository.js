// SQL queries for orders (admin). Only this layer talks to the database.
const db = require('../../../config/db');

const ORDER_NO = "'ORD-' || LPAD(o.id::TEXT, 6, '0')";
const COLUMNS = `o.id, ${ORDER_NO} AS order_no, o.status, o.payment_method, o.payment_status,
  o.subtotal, o.mrp_total, o.coupon_id, o.coupon_code, o.coupon_discount, o.shipping_fee, o.total,
  o.ship_name, o.ship_phone, o.ship_address_line1, o.ship_address_line2, o.ship_landmark,
  o.ship_city, o.ship_state, o.ship_pincode, o.billing_same_as_shipping, o.bill_name, o.bill_phone, o.bill_address_line1, o.bill_address_line2,
  o.bill_landmark, o.bill_city, o.bill_state, o.bill_pincode, o.bill_company_name, o.bill_gstin,
  o.customer_note, o.admin_notes, o.cancel_reason,
  o.confirmed_at, o.shipped_at, o.delivered_at, o.cancelled_at, o.created_at, o.updated_at,
  o.user_id, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count`;
const FROM = 'orders o JOIN users u ON u.id = o.user_id';

// Filters: status, paymentStatus, userId, dateFrom/dateTo (order date in India time), search
// (order no "ORD-000012", customer name/email/phone, delivery name/phone, pincode).
function buildFilters({ status, paymentStatus, userId, dateFrom, dateTo, search }) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replaceAll('?', `$${params.length}`));
  };
  if (status) add('o.status = ?', status);
  if (paymentStatus) add('o.payment_status = ?', paymentStatus);
  if (userId) add('o.user_id = ?', userId);
  if (dateFrom) add("o.created_at >= (?::DATE)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata'", dateFrom);
  if (dateTo) add("o.created_at < (?::DATE + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata'", dateTo);
  if (search) {
    const orderId = /^ord-?0*(\d+)$/i.exec(search);
    if (orderId) add('o.id = ?', Number(orderId[1]));
    else {
      add(`(u.name ILIKE ? OR u.email ILIKE ? OR u.phone ILIKE ? OR o.ship_name ILIKE ?
        OR o.ship_phone ILIKE ? OR o.ship_pincode ILIKE ? OR o.bill_company_name ILIKE ? OR o.bill_gstin ILIKE ?)`,
      `%${search}%`);
    }
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findAll(filters, { limit, offset }) {
  const { where, params } = buildFilters(filters);
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM ${FROM} ${where}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM ${FROM} ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function countByStatus() {
  const { rows } = await db.query('SELECT status, COUNT(*) AS total FROM orders GROUP BY status');
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM ${FROM} WHERE o.id = $1`, [id]);
  return rows[0] || null;
}

async function findItems(orderId) {
  const { rows } = await db.query(
    `SELECT id, product_id, variant_id, product_name, product_slug, variant_label, sku, image,
       unit_price, final_price, quantity, line_total
     FROM order_items WHERE order_id = $1 ORDER BY id`,
    [orderId],
  );
  return rows;
}

const UPDATABLE = ['status', 'payment_status', 'admin_notes', 'cancel_reason',
  'confirmed_at', 'shipped_at', 'delivered_at', 'cancelled_at'];

// Updates the given fields only if the status is still `expectedStatus` (guards against two admins
// changing the same order at once). Returns false if it changed meanwhile.
async function update(id, data, expectedStatus) {
  const fields = UPDATABLE.filter((key) => data[key] !== undefined);
  if (!fields.length) return true;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id, expectedStatus];
  const { rowCount } = await db.query(
    `UPDATE orders SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length - 1} AND status = $${params.length}`,
    params,
  );
  return rowCount === 1;
}

module.exports = { findAll, countByStatus, findById, findItems, update };
