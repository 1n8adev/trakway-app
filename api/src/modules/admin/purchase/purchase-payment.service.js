// Business rules for purchase payments: money Trakway sends a supplier against a bill.
// A bill can be paid in parts; the total paid never goes above the bill's grand_total.
const db = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const { round2, formatInr } = require('../../../utils/money');
const paymentRepository = require('./purchase-payment.repository');
const { methodLabel } = require('../vendor-invoice/vendor-invoice.service');

const format = (payment) => ({ ...payment, method_label: methodLabel(payment.method) });

// { grand_total, amount_paid, balance, payment_status } of a bill.
function paymentSummary(grandTotal, paid) {
  const amountPaid = round2(paid);
  const balance = round2(grandTotal - amountPaid);
  let status = 'unpaid';
  if (amountPaid > 0) status = balance <= 0 ? 'paid' : 'partial';
  return { amount_paid: amountPaid, balance, payment_status: status };
}

const pick = ({ paid_on: paidOn, amount, method, reference, notes }) => ({
  paid_on: paidOn,
  amount: Number(amount),
  method,
  reference: reference ?? null,
  notes: notes ?? null,
});

// Runs fn inside a transaction with the bill locked, after checking the amount fits the balance.
async function withinBalance(purchaseId, amount, excludeId, fn) {
  return db.withTransaction(async (client) => {
    const totals = await paymentRepository.lockTotals(client, purchaseId, excludeId);
    if (!totals) throw ApiError.notFound('Purchase not found');
    const balance = round2(totals.grand_total - totals.paid);
    if (amount > balance) {
      const msg = balance > 0 ? `Only ${formatInr(balance)} is left to pay on this bill` : 'This bill is already fully paid';
      throw ApiError.badRequest(msg, { amount: msg });
    }
    return fn(client);
  });
}

async function list(purchaseId) {
  return (await paymentRepository.findByPurchase(purchaseId)).map(format);
}

async function create(purchaseId, body, adminId) {
  const payment = pick(body);
  const id = await withinBalance(purchaseId, payment.amount, null, (client) => paymentRepository.insert(client, purchaseId, payment, adminId));
  return format(await paymentRepository.findById(purchaseId, id));
}

async function update(purchaseId, id, body) {
  if (!(await paymentRepository.findById(purchaseId, id))) throw ApiError.notFound('Payment not found');
  const payment = pick(body);
  await withinBalance(purchaseId, payment.amount, id, (client) => paymentRepository.update(client, id, payment));
  return format(await paymentRepository.findById(purchaseId, id));
}

async function remove(purchaseId, id) {
  if (!(await paymentRepository.remove(purchaseId, id))) throw ApiError.notFound('Payment not found');
}

module.exports = { list, create, update, remove, paymentSummary, format };
