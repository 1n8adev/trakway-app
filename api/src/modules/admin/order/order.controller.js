// HTTP layer: read req, call order.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const orderService = require('./order.service');
const invoiceService = require('../../invoice/invoice.service');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseId(value, label = 'order') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

function parseDate(value, name) {
  if (!value) return undefined;
  if (!DATE_REGEX.test(value)) throw ApiError.badRequest(`${name} must be YYYY-MM-DD`);
  return value;
}

function oneOf(value, list, name) {
  if (!value) return undefined;
  if (!list.includes(value)) throw ApiError.badRequest(`${name} must be ${list.join(', ')}`);
  return value;
}

// ?status=&payment_status=&user_id=&search=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const q = req.query;
  const { items, total } = await orderService.list({
    status: oneOf(q.status, orderService.STATUSES, 'status'),
    paymentStatus: oneOf(q.payment_status, orderService.PAYMENT_STATUSES, 'payment_status'),
    userId: q.user_id ? parseId(q.user_id, 'user') : undefined,
    dateFrom: parseDate(q.from, 'from'),
    dateTo: parseDate(q.to, 'to'),
    search: q.search?.trim() || undefined,
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const summary = asyncHandler(async (req, res) => {
  response.success(res, await orderService.summary());
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await orderService.getById(parseId(req.params.id)));
});

const setStatus = asyncHandler(async (req, res) => {
  const { status, admin_notes: notes, cancel_reason: reason } = req.body;
  const order = await orderService.setStatus(parseId(req.params.id), { status, admin_notes: notes, cancel_reason: reason });
  response.success(res, order, `Order ${order.order_no} marked as ${order.status}`);
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await orderService.updateNotes(parseId(req.params.id), req.body.admin_notes), 'Order updated');
});

// PDF tax invoice for any order (not cancelled ones).
const invoice = asyncHandler(async (req, res) => {
  invoiceService.sendPdf(res, await invoiceService.getInvoicePdf(parseId(req.params.id)));
});

module.exports = { list, summary, getById, setStatus, update, invoice };
