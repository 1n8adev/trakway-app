// Minimal Razorpay REST client (https://razorpay.com/docs/api/) over fetch, plus signature checks.
// Amounts sent to / received from Razorpay are in paise; helpers convert from/to rupees.
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('./ApiError');

const BASE_URL = 'https://api.razorpay.com/v1';
const TIMEOUT_MS = 15000;

const isConfigured = () => Boolean(env.razorpay.keyId && env.razorpay.keySecret);
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => Math.round(Number(paise)) / 100;

async function request(method, path, body) {
  if (!isConfigured()) throw ApiError.badRequest('Online payment is not available right now');
  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, ...(body && { 'Content-Type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`Razorpay ${method} ${path} failed:`, err.message);
    throw new ApiError(502, 'Could not reach the payment gateway. Please try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const description = data.error?.description || `HTTP ${res.status}`;
    console.error(`Razorpay ${method} ${path} error:`, description);
    const error = new ApiError(502, `Payment gateway error: ${description}`);
    error.razorpay = data.error;
    throw error;
  }
  return data;
}

// Razorpay order for the given amount (rupees). receipt = our order number.
const createOrder = ({ amount, receipt, notes }) => request('POST', '/orders', {
  amount: toPaise(amount), currency: 'INR', receipt, notes,
});
const fetchOrderPayments = (razorpayOrderId) => request('GET', `/orders/${encodeURIComponent(razorpayOrderId)}/payments`)
  .then((data) => data.items || []);
const fetchPayment = (paymentId) => request('GET', `/payments/${encodeURIComponent(paymentId)}`);
const capturePayment = (paymentId, amountPaise) => request('POST', `/payments/${encodeURIComponent(paymentId)}/capture`, {
  amount: amountPaise, currency: 'INR',
});
// Full refund when amount is omitted.
const refundPayment = (paymentId, { amountPaise, notes } = {}) => request('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, {
  ...(amountPaise && { amount: amountPaise }), ...(notes && { notes }),
});

function safeEqualHex(expected, actual) {
  if (typeof actual !== 'string' || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

// Checkout handler signature: HMAC-SHA256(order_id + "|" + payment_id, key secret).
function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  if (!isConfigured()) return false;
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

// Webhook signature (X-Razorpay-Signature): HMAC-SHA256(raw request body, webhook secret).
function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret || !rawBody) return false;
  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

module.exports = {
  isConfigured, toPaise, toRupees, createOrder, fetchOrderPayments, fetchPayment, capturePayment, refundPayment,
  verifyPaymentSignature, verifyWebhookSignature,
};
