// SQL queries for coupons (admin). Only this layer talks to the database.
const db = require('../../../config/db');

// used_count = orders with the coupon that are not cancelled (what limits count).
const COLUMNS = `c.id, c.code, c.description, c.discount_type, c.discount_value, c.max_discount, c.min_order_amount,
  c.starts_at, c.expires_at, c.usage_limit, c.per_user_limit, c.is_active, c.created_at, c.updated_at,
  (SELECT COUNT(*) FROM orders o WHERE o.coupon_id = c.id AND o.status <> 'cancelled') AS used_count,
  (SELECT COALESCE(SUM(o.coupon_discount), 0) FROM orders o WHERE o.coupon_id = c.id AND o.status <> 'cancelled') AS total_discount`;

const FIELDS = ['code', 'description', 'discount_type', 'discount_value', 'max_discount', 'min_order_amount',
  'starts_at', 'expires_at', 'usage_limit', 'per_user_limit', 'is_active'];

async function findAll({ search, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.code ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`c.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM coupons c ${where}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM coupons c ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM coupons c WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function codeExists(code, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM coupons WHERE UPPER(code) = UPPER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [code, excludeId],
  );
  return rows.length > 0;
}

// Orders of any status that used the coupon (a used coupon is kept for order history).
async function countOrders(id) {
  const { rows } = await db.query('SELECT COUNT(*) AS total FROM orders WHERE coupon_id = $1', [id]);
  return rows[0].total;
}

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO coupons (${FIELDS.join(', ')})
     VALUES (${FIELDS.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    FIELDS.map((key) => data[key] ?? null),
  );
  return rows[0].id;
}

async function update(id, data) {
  const fields = FIELDS.filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await db.query(`UPDATE coupons SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

async function remove(id) {
  await db.query('DELETE FROM coupons WHERE id = $1', [id]);
}

module.exports = { FIELDS, findAll, findById, codeExists, countOrders, create, update, remove };
