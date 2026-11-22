// HTTP layer: read req, call supplier.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const supplierService = require('./supplier.service');
const { TEXT_FIELDS } = require('./supplier.validation');

const FIELDS = [...TEXT_FIELDS, 'is_active'];

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid supplier id');
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
  const { items, total } = await supplierService.list({
    search: search?.trim() || undefined,
    state: state?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await supplierService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  response.created(res, await supplierService.create(pick(req.body)), 'Supplier added');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await supplierService.update(parseId(req.params.id), pick(req.body)), 'Supplier updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const supplier = await supplierService.update(parseId(req.params.id), { is_active: req.body.is_active });
  response.success(res, supplier, `Supplier ${supplier.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await supplierService.remove(parseId(req.params.id));
  response.success(res, null, 'Supplier deleted');
});

module.exports = { list, getById, create, update, setStatus, remove };
