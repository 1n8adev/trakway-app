// HTTP layer: read req, call vendor-invoice.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const { sendPdf } = require('../../invoice/invoice.service');
const vendorInvoiceService = require('./vendor-invoice.service');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseId(value, label = 'invoice') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

// ?search=&type_id=&vendor_id=&status=issued|cancelled&payment_status=unpaid|partial|paid&from=&to= (invoice date)
function filtersFrom(query) {
  const vendorId = Number(query.vendor_id);
  const typeId = Number(query.type_id);
  return {
    search: query.search?.trim() || undefined,
    typeId: Number.isInteger(typeId) && typeId > 0 ? typeId : undefined,
    vendorId: Number.isInteger(vendorId) && vendorId > 0 ? vendorId : undefined,
    status: ['issued', 'cancelled'].includes(query.status) ? query.status : undefined,
    paymentStatus: ['unpaid', 'partial', 'paid'].includes(query.payment_status) ? query.payment_status : undefined,
    from: DATE_REGEX.test(query.from || '') ? query.from : undefined,
    to: DATE_REGEX.test(query.to || '') ? query.to : undefined,
  };
}

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { items, total } = await vendorInvoiceService.list(filtersFrom(req.query), pagination);
  response.paginated(res, items, { ...pagination, total });
});

// Same filters as the list; status is ignored (only issued invoices count).
const summary = asyncHandler(async (req, res) => {
  response.success(res, await vendorInvoiceService.summary(filtersFrom(req.query)));
});

const options = asyncHandler(async (req, res) => {
  response.success(res, await vendorInvoiceService.options());
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await vendorInvoiceService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  const invoice = await vendorInvoiceService.create(req.body, req.user?.id);
  response.created(res, invoice, `${invoice.type_name} ${invoice.invoice_no} created`);
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await vendorInvoiceService.update(parseId(req.params.id), req.body), 'Invoice updated');
});

const cancel = asyncHandler(async (req, res) => {
  response.success(res, await vendorInvoiceService.cancel(parseId(req.params.id)), 'Invoice cancelled');
});

const addPayment = asyncHandler(async (req, res) => {
  response.created(res, await vendorInvoiceService.addPayment(parseId(req.params.id), req.body), 'Payment recorded');
});

const removePayment = asyncHandler(async (req, res) => {
  const invoice = await vendorInvoiceService.removePayment(parseId(req.params.id), parseId(req.params.paymentId, 'payment'));
  response.success(res, invoice, 'Payment removed');
});

const pdf = asyncHandler(async (req, res) => {
  sendPdf(res, await vendorInvoiceService.getPdf(parseId(req.params.id)));
});

module.exports = { list, summary, options, getById, create, update, cancel, addPayment, removePayment, pdf };
