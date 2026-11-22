// HTTP layer: read req, call vendor-invoice-type.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const typeService = require('./vendor-invoice-type.service');

const FIELDS = ['name', 'prefix', 'is_active'];

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid invoice type id');
  return id;
}

const pick = (body) => Object.fromEntries(FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

const list = asyncHandler(async (req, res) => {
  response.success(res, await typeService.list());
});

const create = asyncHandler(async (req, res) => {
  const type = await typeService.create(pick(req.body));
  response.created(res, type, `${type.name} added`);
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await typeService.update(parseId(req.params.id), pick(req.body)), 'Invoice type updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const type = await typeService.update(parseId(req.params.id), { is_active: req.body.is_active });
  response.success(res, type, type.is_active ? `${type.name} activated` : `${type.name} deactivated`);
});

const remove = asyncHandler(async (req, res) => {
  await typeService.remove(parseId(req.params.id));
  response.success(res, null, 'Invoice type deleted');
});

module.exports = { list, create, update, setStatus, remove };
