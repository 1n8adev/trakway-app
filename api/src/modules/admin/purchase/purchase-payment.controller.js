// HTTP layer for purchase payments. Every write responds with the whole purchase (payments, amount_paid,
// balance, payment_status) so the admin page can refresh in one go.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const paymentService = require('./purchase-payment.service');
const purchaseService = require('./purchase.service');

const FIELDS = ['paid_on', 'amount', 'method', 'reference', 'notes'];

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

const pick = (body) => Object.fromEntries(FIELDS.map((key) => [key, body[key]]));

const list = asyncHandler(async (req, res) => {
  const purchaseId = parseId(req.params.id, 'purchase');
  await purchaseService.getById(purchaseId); // 404 if missing
  response.success(res, await paymentService.list(purchaseId));
});

const create = asyncHandler(async (req, res) => {
  const purchaseId = parseId(req.params.id, 'purchase');
  await paymentService.create(purchaseId, pick(req.body), req.user?.id);
  response.created(res, await purchaseService.getById(purchaseId), 'Payment recorded');
});

const update = asyncHandler(async (req, res) => {
  const purchaseId = parseId(req.params.id, 'purchase');
  await paymentService.update(purchaseId, parseId(req.params.paymentId, 'payment'), pick(req.body));
  response.success(res, await purchaseService.getById(purchaseId), 'Payment updated');
});

const remove = asyncHandler(async (req, res) => {
  const purchaseId = parseId(req.params.id, 'purchase');
  await paymentService.remove(purchaseId, parseId(req.params.paymentId, 'payment'));
  response.success(res, await purchaseService.getById(purchaseId), 'Payment deleted');
});

module.exports = { list, create, update, remove };
