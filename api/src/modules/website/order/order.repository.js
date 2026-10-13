// SQL queries for checkout and customer orders. Only this layer talks to the database.
const db = require('../../../config/db');

const ORDER_NO = "'ORD-' || LPAD(o.id::TEXT, 6, '0')";
const ORDER_COLUMNS = `o.id, ${ORDER_NO} AS order_no, o.user_id, o.status, o.payment_method, o.payment_status,
  o.subtotal, o.mrp_total, o.coupon_code, o.coupon_discount, o.shipping_fee, o.total,
  o.ship_name, o.ship_phone, o.ship_address_line1, o.ship_address_line2, o.ship_landmark,
  o.ship_city, o.ship_state, o.ship_pincode, o.billing_same_as_shipping, o.bill_name, o.bill_phone, o.bill_address_line1, o.bill_address_line2,
  o.bill_landmark, o.bill_city, o.bill_state, o.bill_pincode, o.bill_company_name, o.bill_gstin,
  o.customer_note, o.cancel_reason,
  o.confirmed_at, o.shipped_at, o.delivered_at, o.cancelled_at, o.created_at, o.updated_at`;

// ---- coupons ----

// lock=true (inside the order transaction) serializes uses of the same coupon, so usage limits hold.
async function findCoupon(code, { client = db.pool, lock = false } = {}) {
  const { rows } = await client.query(
    `SELECT id, code, discount_type, discount_value, max_discount, min_order_amount, starts_at, expires_at,
       usage_limit, per_user_limit, is_active
     FROM coupons WHERE UPPER(code) = UPPER($1) ${lock ? 'FOR UPDATE' : ''}`,
    [code],
  );
  return rows[0] || null;
}

// Uses that count against limits: orders with this coupon that are not cancelled.
async function couponUsage(couponId, userId, client = db.pool) {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS total_used, COUNT(*) FILTER (WHERE user_id = $2) AS user_used
     FROM orders WHERE coupon_id = $1 AND status <> 'cancelled'`,
    [couponId, userId],
  );
  return rows[0];
}

// ---- orders ----

const INSERT_FIELDS = ['user_id', 'subtotal', 'mrp_total', 'coupon_id', 'coupon_code', 'coupon_discount',
  'shipping_fee', 'total', 'ship_name', 'ship_phone', 'ship_address_line1', 'ship_address_line2', 'ship_landmark',
  'ship_city', 'ship_state', 'ship_pincode', 'billing_same_as_shipping', 'bill_name', 'bill_phone',
  'bill_address_line1', 'bill_address_line2', 'bill_landmark', 'bill_city', 'bill_state', 'bill_pincode',
  'bill_company_name', 'bill_gstin', 'customer_note'];

async function createOrder(data, client) {
  const { rows } = await client.query(
    `INSERT INTO orders (${INSERT_FIELDS.join(', ')})
     VALUES (${INSERT_FIELDS.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    INSERT_FIELDS.map((key) => data[key] ?? null),
  );
  return rows[0].id;
}

async function addItems(orderId, items, client) {
  const col = (key) => items.map((item) => item[key] ?? null);
  await client.query(
    `INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_slug, variant_label, sku, image,
       unit_price, final_price, quantity, line_total)
     SELECT $1, * FROM unnest($2::BIGINT[], $3::BIGINT[], $4::TEXT[], $5::TEXT[], $6::TEXT[], $7::TEXT[], $8::TEXT[],
       $9::NUMERIC[], $10::NUMERIC[], $11::INT[], $12::NUMERIC[])`,
    [orderId, col('product_id'), col('variant_id'), col('product_name'), col('product_slug'), col('variant_label'),
      col('sku'), col('image'), col('unit_price'), col('final_price'), col('quantity'), col('line_total')],
  );
}

// Customer's orders, newest first, with a preview of the first item.
async function findByUser(userId, { limit, offset }) {
  const [list, count] = await Promise.all([
    db.query(
      `SELECT o.id, ${ORDER_NO} AS order_no, o.status, o.payment_method, o.payment_status, o.total, o.created_at,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
         (SELECT JSON_BUILD_OBJECT('product_name', oi.product_name, 'variant_label', oi.variant_label, 'image', oi.image)
            FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 1) AS first_item
       FROM orders o WHERE o.user_id = $1
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    db.query('SELECT COUNT(*) AS total FROM orders WHERE user_id = $1', [userId]),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.id = $1`, [id]);
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

// Cancels only while still "placed". Returns false if the status changed meanwhile.
async function cancelPlaced(id, reason) {
  const { rowCount } = await db.query(
    `UPDATE orders SET status = 'cancelled', payment_status = 'cancelled', cancel_reason = $2,
       cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'placed'`,
    [id, reason],
  );
  return rowCount === 1;
}

module.exports = {
  findCoupon, couponUsage, createOrder, addItems, findByUser, findById, findItems, cancelPlaced,
};
