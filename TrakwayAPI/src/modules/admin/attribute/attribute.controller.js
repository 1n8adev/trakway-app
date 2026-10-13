// HTTP layer: read req, call attribute.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const attributeService = require('./attribute.service');

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

const attributeId = (req) => parseId(req.params.id, 'attribute');
const valueId = (req) => parseId(req.params.valueId, 'value');

// Keeps only the given fields and trims strings (also inside the values list).
function pickFields(body, fields) {
  const data = {};
  for (const key of fields) {
    if (body[key] === undefined) continue;
    const v = body[key];
    if (typeof v === 'string') data[key] = v.trim();
    else if (Array.isArray(v)) data[key] = v.map((item) => (typeof item === 'string' ? item.trim() : item));
    else data[key] = v;
  }
  return data;
}

const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const attributes = await attributeService.list({
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    search: search?.trim() || undefined,
  });
  response.success(res, attributes);
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await attributeService.getById(attributeId(req)));
});

const create = asyncHandler(async (req, res) => {
  const attribute = await attributeService.create(pickFields(req.body, ['name', 'values', 'sort_order', 'is_active']));
  response.created(res, attribute, 'Attribute created');
});

const update = asyncHandler(async (req, res) => {
  const attribute = await attributeService.update(attributeId(req), pickFields(req.body, ['name', 'sort_order', 'is_active']));
  response.success(res, attribute, 'Attribute updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const attribute = await attributeService.setStatus(attributeId(req), req.body.is_active);
  response.success(res, attribute, `Attribute ${attribute.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await attributeService.remove(attributeId(req));
  response.success(res, null, 'Attribute deleted');
});

const addValue = asyncHandler(async (req, res) => {
  const attribute = await attributeService.addValue(attributeId(req), pickFields(req.body, ['value', 'sort_order', 'is_active']));
  response.created(res, attribute, 'Value added');
});

const updateValue = asyncHandler(async (req, res) => {
  const attribute = await attributeService.updateValue(
    attributeId(req), valueId(req), pickFields(req.body, ['value', 'sort_order', 'is_active']),
  );
  response.success(res, attribute, 'Value updated');
});

const setValueStatus = asyncHandler(async (req, res) => {
  const attribute = await attributeService.setValueStatus(attributeId(req), valueId(req), req.body.is_active);
  response.success(res, attribute, `Value ${req.body.is_active ? 'activated' : 'deactivated'}`);
});

const removeValue = asyncHandler(async (req, res) => {
  const attribute = await attributeService.removeValue(attributeId(req), valueId(req));
  response.success(res, attribute, 'Value deleted');
});

module.exports = {
  list,
  getById,
  create,
  update,
  setStatus,
  remove,
  addValue,
  updateValue,
  setValueStatus,
  removeValue,
};
