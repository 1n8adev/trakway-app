// HTTP layer: read req, call address.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const addressService = require('./address.service');
const { FIELDS } = require('./address.repository');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid address id');
  return id;
}

const pick = (body) => {
  const data = {};
  for (const key of [...FIELDS, 'is_default']) if (body[key] !== undefined) data[key] = body[key];
  return data;
};

const list = asyncHandler(async (req, res) => {
  response.success(res, await addressService.list(req.customer.id));
});

const create = asyncHandler(async (req, res) => {
  response.created(res, await addressService.create(req.customer.id, pick(req.body)), 'Address added');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await addressService.update(req.customer.id, parseId(req.params.id), pick(req.body)), 'Address updated');
});

const setDefault = asyncHandler(async (req, res) => {
  response.success(res, await addressService.setDefault(req.customer.id, parseId(req.params.id)), 'Default address updated');
});

const remove = asyncHandler(async (req, res) => {
  await addressService.remove(req.customer.id, parseId(req.params.id));
  response.success(res, null, 'Address deleted');
});

module.exports = { list, create, update, setDefault, remove };
