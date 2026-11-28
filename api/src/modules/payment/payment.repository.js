// SQL for Razorpay payments of website orders. Only this layer talks to the database.
const db = require('../../config/db');

const ORDER_NO = "'ORD-' || LPAD(o.id::TEXT, 6, '0')";
const ORDER_COLUMNS = `o.id, ${ORDER_NO} AS order_no, o.user_id, o.status, o.payment_method, o.payment_status,
  o.total, o.razorpay_order_id, o.paid_at, o.created_at`;
const PAYMENT_COLUMNS = `id, order_id, razorpay_payment_id, razorpay_order_id, amount, currency, status, method, details,
  error_code, error_description, signature_verified, captured_at, refund_id, refund_amount, refund_status, refunded_at,
  created_at, updated_at`;

async function findOrder(id, { client = db.pool, lock = false } = {}) {
  const { rows } = await client.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.id = $1 ${lock ? 'FOR UPDATE' : ''}`, [id],
  );
  return rows[0] || null;
}

async function findOrderByRazorpayOrderId(razorpayOrderId, { client = db.pool, lock = false } = {}) {
  const { rows } = await client.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.razorpay_order_id = $1 ${lock ? 'FOR UPDATE' : ''}`, [razorpayOrderId],
  );
  return rows[0] || null;
}

// Sets the Razorpay order only if none is set yet; returns the one stored.
async function setRazorpayOrderId(orderId, razorpayOrderId) {
  const { rows } = await db.query(
    `UPDATE orders SET razorpay_order_id = COALESCE(razorpay_order_id, $2), updated_at = NOW()
     WHERE id = $1 RETURNING razorpay_order_id`,
    [orderId, razorpayOrderId],
  );
  return rows[0]?.razorpay_order_id ?? null;
}

// Inserts or refreshes one payment attempt from a Razorpay payment entity (amount already in rupees).
async function upsertPayment(orderId, p, client = db.pool) {
  const { rows } = await client.query(
    `INSERT INTO order_payments (order_id, razorpay_payment_id, razorpay_order_id, amount, currency, status, method,
       details, error_code, error_description, signature_verified, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6::VARCHAR, $7, $8, $9, $10, $11, CASE WHEN $6::VARCHAR = 'captured' THEN NOW() END)
     ON CONFLICT (razorpay_payment_id) DO UPDATE SET
       status = CASE WHEN order_payments.status = 'refunded' THEN order_payments.status ELSE EXCLUDED.status END,
       method = COALESCE(EXCLUDED.method, order_payments.method),
       details = EXCLUDED.details,
       error_code = EXCLUDED.error_code,
       error_description = EXCLUDED.error_description,
       signature_verified = order_payments.signature_verified OR EXCLUDED.signature_verified,
       captured_at = COALESCE(order_payments.captured_at, EXCLUDED.captured_at),
       updated_at = NOW()
     RETURNING ${PAYMENT_COLUMNS}`,
    [orderId, p.razorpay_payment_id, p.razorpay_order_id, p.amount, p.currency, p.status, p.method,
      JSON.stringify(p.details || {}), p.error_code, p.error_description, Boolean(p.signature_verified)],
  );
  return rows[0];
}

// pending_payment -> placed + paid. Returns false if the order was no longer waiting for payment.
async function markPaid(orderId, client) {
  const { rowCount } = await client.query(
    `UPDATE orders SET status = 'placed', payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending_payment'`,
    [orderId],
  );
  return rowCount === 1;
}

// Cancels an unpaid online order. Returns false if it was paid or changed meanwhile.
async function cancelPending(orderId, reason, client = db.pool) {
  const { rowCount } = await client.query(
    `UPDATE orders SET status = 'cancelled', payment_status = 'failed', cancel_reason = $2,
       cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending_payment'`,
    [orderId, reason],
  );
  return rowCount === 1;
}

async function findPayments(orderId) {
  const { rows } = await db.query(
    `SELECT ${PAYMENT_COLUMNS} FROM order_payments WHERE order_id = $1 ORDER BY created_at DESC, id DESC`, [orderId],
  );
  return rows;
}

// Captured payments of the order that have not been refunded yet.
async function findRefundablePayments(orderId) {
  const { rows } = await db.query(
    `SELECT ${PAYMENT_COLUMNS} FROM order_payments
     WHERE order_id = $1 AND status = 'captured' AND refund_id IS NULL ORDER BY id`,
    [orderId],
  );
  return rows;
}

async function setRefund(paymentId, { refund_id: refundId, refund_amount: amount, refund_status: status }) {
  await db.query(
    `UPDATE order_payments SET refund_id = $2, refund_amount = $3, refund_status = $4, status = 'refunded',
       refunded_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [paymentId, refundId, amount, status],
  );
}

async function setRefundStatus(refundId, status) {
  await db.query(
    'UPDATE order_payments SET refund_status = $2, updated_at = NOW() WHERE refund_id = $1', [refundId, status],
  );
}

async function setOrderPaymentStatus(orderId, paymentStatus) {
  await db.query('UPDATE orders SET payment_status = $2, updated_at = NOW() WHERE id = $1', [orderId, paymentStatus]);
}

// Online orders still waiting for payment after `minutes`.
async function findStalePending(minutes) {
  const { rows } = await db.query(
    `SELECT id FROM orders WHERE status = 'pending_payment' AND created_at < NOW() - ($1 || ' minutes')::INTERVAL
     ORDER BY id LIMIT 50`,
    [String(minutes)],
  );
  return rows.map((row) => row.id);
}

async function findPendingByUser(userId) {
  const { rows } = await db.query(
    "SELECT id FROM orders WHERE user_id = $1 AND status = 'pending_payment' ORDER BY id", [userId],
  );
  return rows.map((row) => row.id);
}

async function findPaymentByRazorpayId(razorpayPaymentId) {
  const { rows } = await db.query(
    `SELECT ${PAYMENT_COLUMNS} FROM order_payments WHERE razorpay_payment_id = $1`, [razorpayPaymentId],
  );
  return rows[0] || null;
}

// True if the order has a captured (or refunded) payment other than this one, captured before it.
async function hasOtherCaptured(orderId, razorpayPaymentId, client = db.pool) {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM order_payments o2
       WHERE o2.order_id = $1 AND o2.razorpay_payment_id <> $2 AND o2.captured_at IS NOT NULL
         AND o2.captured_at <= (SELECT captured_at FROM order_payments WHERE razorpay_payment_id = $2)
     ) AS found`,
    [orderId, razorpayPaymentId],
  );
  return rows[0].found;
}

async function findCustomer(userId) {
  const { rows } = await db.query('SELECT id, name, email, phone FROM users WHERE id = $1', [userId]);
  return rows[0] || null;
}

module.exports = {
  findPaymentByRazorpayId, hasOtherCaptured, findCustomer, findOrder, findOrderByRazorpayOrderId, setRazorpayOrderId, upsertPayment, markPaid, cancelPending, findPayments,
  findRefundablePayments, setRefund, setRefundStatus, setOrderPaymentStatus, findStalePending, findPendingByUser,
};
