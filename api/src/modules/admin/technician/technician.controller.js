// HTTP layer: read req, call technician.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const technicianService = require('./technician.service');
const { TEXT_FIELDS, PHOTO_FIELDS } = require('./technician.validation');

const FIELDS = [...TEXT_FIELDS, ...PHOTO_FIELDS, 'is_active'];

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid technician id');
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
  const { items, total } = await technicianService.list({
    search: search?.trim() || undefined,
    state: state?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await technicianService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  response.created(res, await technicianService.create(pick(req.body)), 'Technician onboarded');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await technicianService.update(parseId(req.params.id), pick(req.body)), 'Technician updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const technician = await technicianService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, technician, `Technician ${technician.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await technicianService.remove(parseId(req.params.id));
  response.success(res, null, 'Technician deleted');
});

// Streams the private ID proof image. Admin token required; never cached by browsers or proxies.
const idProof = asyncHandler(async (req, res) => {
  const filePath = await technicianService.idProofFile(parseId(req.params.id));
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
});

module.exports = { list, getById, create, update, setStatus, remove, idProof };
