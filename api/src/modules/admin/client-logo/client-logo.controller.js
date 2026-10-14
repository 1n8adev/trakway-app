// HTTP layer: read req, call client-logo.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const clientLogoService = require('./client-logo.service');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid client logo id');
  return id;
}

// Keeps only known fields and trims strings.
function pickFields(body) {
  const data = {};
  for (const key of ['name', 'image', 'sort_order', 'is_active']) {
    if (body[key] !== undefined) {
      data[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
  }
  return data;
}

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { search, status } = req.query;

  const filters = {
    search: search?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  };

  const { items, total } = await clientLogoService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await clientLogoService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  const logo = await clientLogoService.create(pickFields(req.body));
  response.created(res, logo, 'Client logo created');
});

const update = asyncHandler(async (req, res) => {
  const logo = await clientLogoService.update(parseId(req.params.id), pickFields(req.body));
  response.success(res, logo, 'Client logo updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const logo = await clientLogoService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, logo, `Client logo ${logo.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await clientLogoService.remove(parseId(req.params.id));
  response.success(res, null, 'Client logo deleted');
});

module.exports = { list, getById, create, update, setStatus, remove };
