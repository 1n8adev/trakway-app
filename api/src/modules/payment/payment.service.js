// Razorpay payments for website orders: checkout options, signature verification, capture, webhooks,
// refunds and expiry of unpaid orders. Every path ends in applyPayment(), so the browser handler, the
// webhook and the background sync can arrive in any order (or twice) and give the same result.
const env = require('../../config/env');
const { withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const razorpay = require('../../utils/razorpay');
const cartService = require('../website/cart/cart.service');
const websiteOrderRepository = require('../website/order/order.repository');
const { sendOrderEmails } = require('../website/order/order.emails');
const paymentRepository = require('./payment.repository');

const isEnabled = () => razorpay.isConfigured();

// Razorpay payment entity -> order_payments row (rupees, only the details worth keeping).
function toPaymentRow(entity, signatureVerified = false) {
  const details = {
    email: entity.email, contact: entity.contact, vpa: entity.vpa, bank: entity.bank, wallet: entity.wallet,
    card_network: entity.card?.network, card_last4: entity.card?.last4, card_type: entity.card?.type,
    acquirer_rrn: entity.acquirer_data?.rrn, upi_transaction_id: entity.acquirer_data?.upi_transaction_id,
  };
  return {
    razorpay_payment_id: entity.id,
    razorpay_order_id: entity.order_id,
    amount: razorpay.toRupees(entity.amount),
    currency: entity.currency || 'INR',
    status: entity.status,
    method: entity.method || null,
    details: Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined && v !== null && v !== '')),
    error_code: entity.error_code || null,
    error_description: entity.error_description ? String(entity.error_description).slice(0, 500) : null,
    signature_verified: signatureVerified,
  };
}

const amountMatches = (order, entity) => razorpay.toPaise(order.total) === Number(entity.amount)
  && (entity.currency || 'INR') === 'INR';

async function sendPaidEmails(orderId) {
  const order = await websiteOrderRepository.findById(orderId);
  const customer = order && await paymentRepository.findCustomer(order.user_id);
  if (!customer) return;
  sendOrderEmails(order, await websiteOrderRepository.findItems(orderId), customer);
}

// Full refund of every captured, not yet refunded payment of the order. Returns how many were refunded.
async function refundOrder(orderId, reason = 'Order cancelled') {
  const payments = await paymentRepository.findRefundablePayments(orderId);
  for (const payment of payments) {
    const refund = await razorpay.refundPayment(payment.razorpay_payment_id, { notes: { reason: reason.slice(0, 250) } });
    await paymentRepository.setRefund(payment.id, {
      refund_id: refund.id, refund_amount: razorpay.toRupees(refund.amount), refund_status: refund.status,
    });
  }
  if (payments.length) await paymentRepository.setOrderPaymentStatus(orderId, 'refunded');
  return payments.length;
}

// Records a Razorpay payment and settles the order: captured + right amount + still pending -> placed & paid,
// cart emptied, emails sent. A payment that lands on an already cancelled order is refunded.
async function applyPayment(entity, { signatureVerified = false } = {}) {
  let payment = entity;
  if (payment.status === 'authorized') {
    // Auto-capture is off in the Razorpay account: capture it ourselves while the order still wants it.
    // (Authorized payments we never capture are released back to the customer by Razorpay.)
    const order = await paymentRepository.findOrderByRazorpayOrderId(payment.order_id);
    if (order?.status === 'pending_payment' && amountMatches(order, payment)) {
      try {
        payment = await razorpay.capturePayment(payment.id, payment.amount);
      } catch (err) {
        // Already captured elsewhere (webhook vs. browser race): read the current state instead.
        payment = await razorpay.fetchPayment(payment.id);
      }
    }
  }

  const result = await withTransaction(async (client) => {
    const order = await paymentRepository.findOrderByRazorpayOrderId(payment.order_id, { client, lock: true });
    if (!order) return null;
    await paymentRepository.upsertPayment(order.id, toPaymentRow(payment, signatureVerified), client);
    if (payment.status !== 'captured') return { order, justPaid: false, orphan: false };
    if (!amountMatches(order, payment)) {
      console.error(`Razorpay payment ${payment.id} amount ${payment.amount} does not match order ${order.order_no}`);
      return { order, justPaid: false, orphan: false };
    }
    if (order.status === 'pending_payment' && await paymentRepository.markPaid(order.id, client)) {
      await cartService.clearWith(order.user_id, client);
      return { order, justPaid: true, orphan: false };
    }
    // Paid after the order was cancelled (expired / replaced), or a second, different payment on a paid order.
    // The same payment reported again (webhook + browser) is not an orphan.
    const orphan = order.status === 'cancelled'
      || (order.payment_status === 'paid' && await paymentRepository.hasOtherCaptured(order.id, payment.id, client));
    return { order, justPaid: false, orphan };
  });

  if (!result) {
    console.warn(`Razorpay payment ${payment.id}: no order for ${payment.order_id}`);
    return null;
  }
  if (result.justPaid) await sendPaidEmails(result.order.id).catch((err) => console.error('Paid email failed:', err.message));
  if (result.orphan) {
    const reason = result.order.status === 'cancelled' ? 'Order was cancelled before the payment completed' : 'Duplicate payment';
    try {
      if (result.order.status === 'cancelled') await refundOrder(result.order.id, reason);
      else {
        // Duplicate payment on a paid order: refund only this extra payment.
        const row = await paymentRepository.findPaymentByRazorpayId(payment.id);
        const refund = await razorpay.refundPayment(payment.id, { notes: { reason } });
        await paymentRepository.setRefund(row.id, {
          refund_id: refund.id, refund_amount: razorpay.toRupees(refund.amount), refund_status: refund.status,
        });
      }
    } catch (err) {
      console.error(`Refund of payment ${payment.id} (${result.order.order_no}) failed:`, err.message);
    }
  }
  return result;
}

function assertOwnOnlineOrder(order, userId) {
  if (!order || order.user_id !== userId) throw ApiError.notFound('Order not found');
  if (order.payment_method !== 'razorpay') throw ApiError.badRequest('This order is Cash on Delivery');
}

// What the website needs to open Razorpay Checkout for an order waiting for payment.
// Creates the Razorpay order on first use; later calls reuse it (Razorpay allows several attempts per order).
async function checkoutOptions(orderId, customer) {
  const order = await paymentRepository.findOrder(orderId);
  assertOwnOnlineOrder(order, customer.id);
  if (order.status !== 'pending_payment') {
    throw ApiError.conflict(order.payment_status === 'paid' ? 'This order is already paid' : 'This order can no longer be paid');
  }
  let razorpayOrderId = order.razorpay_order_id;
  if (!razorpayOrderId) {
    const created = await razorpay.createOrder({
      amount: order.total, receipt: order.order_no, notes: { order_no: order.order_no, order_id: String(order.id) },
    });
    razorpayOrderId = await paymentRepository.setRazorpayOrderId(order.id, created.id);
  }
  return {
    key_id: env.razorpay.keyId,
    razorpay_order_id: razorpayOrderId,
    amount: razorpay.toPaise(order.total),
    currency: 'INR',
    name: env.razorpay.businessName,
    description: `Order ${order.order_no}`,
    order_no: order.order_no,
    prefill: { name: customer.name, email: customer.email, contact: customer.phone || undefined },
    expires_at: new Date(new Date(order.created_at).getTime() + env.razorpay.pendingMinutes * 60000).toISOString(),
  };
}

// Browser handler result: checks the signature, reads the payment from Razorpay and settles the order.
async function verifyCheckout(customer, orderId, {
  razorpay_order_id: razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature,
}) {
  const order = await paymentRepository.findOrder(orderId);
  assertOwnOnlineOrder(order, customer.id);
  if (!order.razorpay_order_id || order.razorpay_order_id !== razorpayOrderId) {
    throw ApiError.badRequest('This payment does not belong to this order');
  }
  if (!razorpay.verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId: paymentId, signature })) {
    throw ApiError.badRequest('Payment verification failed. If money was deducted, it will be refunded automatically.');
  }
  const entity = await razorpay.fetchPayment(paymentId);
  if (entity.order_id !== order.razorpay_order_id) throw ApiError.badRequest('This payment does not belong to this order');
  await applyPayment(entity, { signatureVerified: true });

  const fresh = await paymentRepository.findOrder(orderId);
  if (fresh.payment_status === 'paid') return fresh;
  if (fresh.status === 'cancelled') {
    throw ApiError.conflict('This order was cancelled before your payment completed. The amount will be refunded to you.');
  }
  throw ApiError.badRequest('Payment was not completed. Please try again.');
}

// Re-reads every payment of the order's Razorpay order (missed webhook, admin "check payment").
async function syncOrder(orderId) {
  const order = await paymentRepository.findOrder(orderId);
  if (!order?.razorpay_order_id) return order;
  const payments = await razorpay.fetchOrderPayments(order.razorpay_order_id);
  // Failed attempts first, so a captured one is applied last.
  const rank = { failed: 0, created: 1, authorized: 2, refunded: 3, captured: 4 };
  payments.sort((a, b) => (rank[a.status] ?? 1) - (rank[b.status] ?? 1));
  for (const payment of payments) await applyPayment(payment);
  return paymentRepository.findOrder(orderId);
}

// Cancels an unpaid online order after one last check with Razorpay. Returns true if cancelled.
async function cancelUnpaid(orderId, reason) {
  try {
    const order = await syncOrder(orderId);
    if (order?.status !== 'pending_payment') return false;
  } catch (err) {
    console.error(`Payment check for order ${orderId} failed:`, err.message);
    // A payment that still completes later is refunded automatically (applyPayment).
  }
  return paymentRepository.cancelPending(orderId, reason);
}

// A new checkout replaces the customer's earlier unpaid ones (they would hold coupon uses and stock).
async function cancelUnpaidForUser(userId) {
  for (const id of await paymentRepository.findPendingByUser(userId)) {
    await cancelUnpaid(id, 'Replaced by a new checkout');
  }
}

// Background job: cancels online orders not paid within RAZORPAY_PENDING_MINUTES.
async function expireStalePending() {
  const ids = await paymentRepository.findStalePending(env.razorpay.pendingMinutes);
  for (const id of ids) {
    if (await cancelUnpaid(id, 'Payment not completed in time')) console.log(`Order ${id}: unpaid, cancelled`);
  }
}

async function handleRefundEntity(refund) {
  const payment = await paymentRepository.findPaymentByRazorpayId(refund.payment_id);
  if (!payment) return;
  if (payment.refund_id && payment.refund_id !== refund.id) return; // partial refunds are not tracked
  if (!payment.refund_id) {
    // Refund started from the Razorpay dashboard.
    await paymentRepository.setRefund(payment.id, {
      refund_id: refund.id, refund_amount: razorpay.toRupees(refund.amount), refund_status: refund.status,
    });
    if (razorpay.toRupees(refund.amount) >= Number(payment.amount)) {
      await paymentRepository.setOrderPaymentStatus(payment.order_id, 'refunded');
    }
    return;
  }
  await paymentRepository.setRefundStatus(refund.id, refund.status);
}

// Webhook event (signature already checked).
async function handleWebhook(event) {
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  switch (event.event) {
    case 'payment.authorized':
    case 'payment.captured':
    case 'payment.failed':
    case 'order.paid':
      if (payment) await applyPayment(payment);
      break;
    case 'refund.created':
    case 'refund.processed':
    case 'refund.failed':
      if (refund) await handleRefundEntity(refund);
      break;
    default:
      break;
  }
}

async function listPayments(orderId) {
  return paymentRepository.findPayments(orderId);
}

module.exports = {
  isEnabled, checkoutOptions, verifyCheckout, syncOrder, refundOrder, cancelUnpaid, cancelUnpaidForUser,
  expireStalePending, handleWebhook, listPayments,
};
