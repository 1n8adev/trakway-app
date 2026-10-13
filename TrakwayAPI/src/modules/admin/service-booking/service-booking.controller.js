// HTTP layer: read req, call service-booking.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const bookingService = require('./service-booking.service');
const { FIELDS } = require('./service-booking.validation');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseId(value, label = 'booking') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

function parseDate(value, name) {
  if (!value) return undefined;
  if (!DATE_REGEX.test(value)) throw ApiError.badRequest(`${name} must be YYYY-MM-DD`);
  return value;
}

const pick = (body) => {
  const data = {};
  for (const key of FIELDS) if (body[key] !== undefined) data[key] = body[key];
  return data;
};

// ?status=open&search=&service=&vehicle_type=&technician_id=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const q = req.query;
  const filters = {
    status: q.status || undefined,
    service: q.service || undefined,
    vehicleType: q.vehicle_type || undefined,
    technicianId: q.technician_id ? parseId(q.technician_id, 'technician') : undefined,
    dateFrom: parseDate(q.from, 'from'),
    dateTo: parseDate(q.to, 'to'),
    search: q.search?.trim() || undefined,
  };
  const { items, total } = await bookingService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const summary = asyncHandler(async (req, res) => {
  response.success(res, await bookingService.summary());
});

const options = asyncHandler(async (req, res) => {
  response.success(res, bookingService.options());
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await bookingService.getById(parseId(req.params.id)));
});

const setStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.update(parseId(req.params.id), pick(req.body));
  response.success(res, booking, `Booking marked as ${booking.status_label}`);
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await bookingService.update(parseId(req.params.id), pick(req.body)), 'Booking updated');
});

// Technician picker: ?search=&limit= (default 20, max 100)
const technicians = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const result = await bookingService.technicianSuggestions(parseId(req.params.id), {
    limit,
    search: req.query.search?.trim() || undefined,
  });
  response.success(res, result);
});

const assign = asyncHandler(async (req, res) => {
  const booking = await bookingService.assign(parseId(req.params.id), pick(req.body));
  response.success(res, booking, `Assigned to ${booking.technician.name}`);
});

const remove = asyncHandler(async (req, res) => {
  await bookingService.remove(parseId(req.params.id));
  response.success(res, null, 'Booking deleted');
});

module.exports = { list, summary, options, getById, setStatus, update, technicians, assign, remove };
