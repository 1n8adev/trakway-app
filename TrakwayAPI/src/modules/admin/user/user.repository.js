// SQL queries for website customers (admin). Only this layer talks to the database.
// Never selects password_hash.
const db = require('../../../config/db');

const COLUMNS = `u.id, u.name, u.email, u.phone, u.email_verified_at, (u.email_verified_at IS NOT NULL) AS email_verified,
  u.is_active, u.last_login_at, u.created_at, u.updated_at`;

// Per-customer order figures (joined as "os"):
//   orders_count all orders · active_orders placed/confirmed/shipped · total_spent delivered (cash collected)
const ORDER_STATS_JOIN = `LEFT JOIN LATERAL (
  SELECT COUNT(*) AS orders_count,
    COUNT(*) FILTER (WHERE o.status IN ('placed', 'confirmed', 'shipped')) AS active_orders,
    COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) AS total_spent,
    MAX(o.created_at) AS last_order_at
  FROM orders o WHERE o.user_id = u.id
) os ON TRUE`;
const ORDER_STATS_COLUMNS = 'os.orders_count, os.active_orders, os.total_spent, os.last_order_at';

const SORTS = {
  newest: 'u.created_at DESC, u.id DESC',
  orders: 'os.orders_count DESC, u.id DESC',
  spent: 'os.total_spent DESC, u.id DESC',
  last_order: 'os.last_order_at DESC NULLS LAST, u.id DESC',
};

// Filters: search (name, email, phone), isActive, verified, hasOrders. sort: newest | orders | spent | last_order.
async function findAll({ search, isActive, verified, hasOrders, sort = 'newest' }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(u.name ILIKE ${p} OR u.email ILIKE ${p} OR u.phone ILIKE ${p})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`u.is_active = $${params.length}`);
  }
  if (verified !== undefined) conditions.push(`u.email_verified_at IS ${verified ? 'NOT ' : ''}NULL`);
  if (hasOrders !== undefined) conditions.push(`os.orders_count ${hasOrders ? '> 0' : '= 0'}`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS}, ${ORDER_STATS_COLUMNS} FROM users u ${ORDER_STATS_JOIN} ${where}
       ORDER BY ${SORTS[sort] || SORTS.newest}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM users u ${ORDER_STATS_JOIN} ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

// { all, verified, unverified, active, inactive }
async function counts() {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS all,
       COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS verified,
       COUNT(*) FILTER (WHERE email_verified_at IS NULL) AS unverified,
       COUNT(*) FILTER (WHERE is_active) AS active,
       COUNT(*) FILTER (WHERE NOT is_active) AS inactive
     FROM users`,
  );
  return rows[0];
}

// One customer, with how many devices are currently logged in and what is in their cart.
async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS},
       (SELECT COUNT(*) FROM refresh_tokens rt
         WHERE rt.user_id = u.id AND rt.revoked_at IS NULL AND rt.expires_at > NOW()) AS active_sessions,
       (SELECT COUNT(*) FROM cart_items ci WHERE ci.user_id = u.id) AS cart_lines,
       (SELECT COALESCE(SUM(ci.quantity), 0) FROM cart_items ci WHERE ci.user_id = u.id) AS cart_quantity
     FROM users u WHERE u.id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Order figures for one customer.
async function findOrderStats(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS orders_count,
       COUNT(*) FILTER (WHERE status = 'placed') AS placed,
       COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
       COUNT(*) FILTER (WHERE status = 'shipped') AS shipped,
       COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
       COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) AS total_spent,
       COALESCE(SUM(total) FILTER (WHERE status IN ('placed', 'confirmed', 'shipped')), 0) AS pending_amount,
       COALESCE(SUM(coupon_discount) FILTER (WHERE status <> 'cancelled'), 0) AS coupon_savings,
       COALESCE(SUM(mrp_total - subtotal) FILTER (WHERE status <> 'cancelled'), 0) AS offer_savings,
       MIN(created_at) AS first_order_at,
       MAX(created_at) AS last_order_at
     FROM orders WHERE user_id = $1`,
    [userId],
  );
  return rows[0];
}

async function findAddresses(userId) {
  const { rows } = await db.query(
    `SELECT id, name, phone, address_line1, address_line2, landmark, city, state, pincode, is_default, created_at
     FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [userId],
  );
  return rows;
}

// Every order of the customer, newest first, each with its items.
async function findOrdersWithItems(userId) {
  const { rows } = await db.query(
    `SELECT o.id, 'ORD-' || LPAD(o.id::TEXT, 6, '0') AS order_no, o.status, o.payment_method, o.payment_status,
       o.subtotal, o.mrp_total, o.coupon_code, o.coupon_discount, o.shipping_fee, o.total,
       o.ship_name, o.ship_phone, o.ship_address_line1, o.ship_address_line2, o.ship_landmark,
       o.ship_city, o.ship_state, o.ship_pincode, o.billing_same_as_shipping, o.bill_name, o.bill_phone, o.bill_address_line1, o.bill_address_line2,
  o.bill_landmark, o.bill_city, o.bill_state, o.bill_pincode, o.bill_company_name, o.bill_gstin,
       o.customer_note, o.admin_notes, o.cancel_reason,
       o.confirmed_at, o.shipped_at, o.delivered_at, o.cancelled_at, o.created_at, o.updated_at,
       COALESCE((
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
           'id', oi.id, 'product_id', oi.product_id, 'variant_id', oi.variant_id, 'product_name', oi.product_name,
           'product_slug', oi.product_slug, 'variant_label', oi.variant_label, 'sku', oi.sku, 'image', oi.image,
           'unit_price', oi.unit_price, 'final_price', oi.final_price, 'quantity', oi.quantity, 'line_total', oi.line_total
         ) ORDER BY oi.id)
         FROM order_items oi WHERE oi.order_id = o.id
       ), '[]') AS items
     FROM orders o WHERE o.user_id = $1
     ORDER BY o.created_at DESC, o.id DESC`,
    [userId],
  );
  return rows;
}

// Blocking a customer also logs them out of every device.
async function setActive(id, isActive) {
  await db.withTransaction(async (client) => {
    await client.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, id]);
    if (!isActive) {
      await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    }
  });
}

module.exports = {
  SORTS, findAll, counts, findById, findOrderStats, findAddresses, findOrdersWithItems, setActive,
};
