// SQL queries for purchase payments (money Trakway sends a supplier against a bill).
const db = require('../../../config/db');

const COLUMNS = `pp.id, pp.purchase_id, pp.paid_on, pp.amount, pp.method, pp.reference, pp.notes, pp.created_by,
  a.name AS created_by_name, pp.created_at, pp.updated_at`;

async function findByPurchase(purchaseId) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM purchase_payments pp LEFT JOIN admin_users a ON a.id = pp.created_by
     WHERE pp.purchase_id = $1 ORDER BY pp.paid_on, pp.id`,
    [purchaseId],
  );
  return rows;
}

async function findById(purchaseId, id) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM purchase_payments pp LEFT JOIN admin_users a ON a.id = pp.created_by
     WHERE pp.purchase_id = $1 AND pp.id = $2`,
    [purchaseId, id],
  );
  return rows[0] || null;
}

// Locks the purchase row so two payments entered at once can't together overpay the bill.
// Returns { grand_total, paid } where paid leaves out excludeId (the payment being edited).
async function lockTotals(client, purchaseId, excludeId = null) {
  const { rows } = await client.query('SELECT grand_total FROM purchases WHERE id = $1 FOR UPDATE', [purchaseId]);
  if (!rows[0]) return null;
  const paid = await client.query(
    'SELECT COALESCE(SUM(amount), 0) AS paid FROM purchase_payments WHERE purchase_id = $1 AND ($2::BIGINT IS NULL OR id <> $2)',
    [purchaseId, excludeId],
  );
  return { grand_total: rows[0].grand_total, paid: paid.rows[0].paid };
}

const WRITABLE = ['paid_on', 'amount', 'method', 'reference', 'notes'];

async function insert(client, purchaseId, payment, adminId) {
  const { rows } = await client.query(
    `INSERT INTO purchase_payments (purchase_id, ${WRITABLE.join(', ')}, created_by)
     VALUES ($1, ${WRITABLE.map((_, i) => `$${i + 2}`).join(', ')}, $${WRITABLE.length + 2}) RETURNING id`,
    [purchaseId, ...WRITABLE.map((key) => payment[key] ?? null), adminId ?? null],
  );
  return rows[0].id;
}

async function update(client, id, payment) {
  await client.query(
    `UPDATE purchase_payments SET ${WRITABLE.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW()
     WHERE id = $${WRITABLE.length + 1}`,
    [...WRITABLE.map((key) => payment[key] ?? null), id],
  );
}

async function remove(purchaseId, id) {
  const { rowCount } = await db.query('DELETE FROM purchase_payments WHERE purchase_id = $1 AND id = $2', [purchaseId, id]);
  return rowCount > 0;
}

async function totalPaid(purchaseId, client = db) {
  const { rows } = await client.query('SELECT COALESCE(SUM(amount), 0) AS paid FROM purchase_payments WHERE purchase_id = $1', [purchaseId]);
  return rows[0].paid;
}

module.exports = { findByPurchase, findById, lockTotals, insert, update, remove, totalPaid };
