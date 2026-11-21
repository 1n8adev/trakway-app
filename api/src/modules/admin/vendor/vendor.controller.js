// HTTP layer: read req, call vendor.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const vendorService = require('./vendor.service');
const { TEXT_FIELDS } = require('./vendor.validation');

const FIELDS = [...TEXT_FIELDS, 'is_active'];

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid vendor id');
  return id;
}

const pick = (body) => {
  const data = {};
  for (const key of FIELDS) if (body[key] !== undefined) data[key] = body[key];
  return data;
};

// ?search=&state=&status=active|inactive&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { search, state, status } = req.query;
  const { items, total } = await vendorService.list({
    search: search?.trim() || undefined,
    state: state?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await vendorService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  response.created(res, await vendorService.create(pick(req.body)), 'Vendor added');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await vendorService.update(parseId(req.params.id), pick(req.body)), 'Vendor updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const vendor = await vendorService.update(parseId(req.params.id), { is_active: req.body.is_active });
  response.success(res, vendor, `Vendor ${vendor.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await vendorService.remove(parseId(req.params.id));
  response.success(res, null, 'Vendor deleted');
});

module.exports = { list, getById, create, update, setStatus, remove };
