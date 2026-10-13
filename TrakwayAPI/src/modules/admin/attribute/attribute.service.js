// Business logic for attributes and their values. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const { withTransaction } = require('../../../config/db');
const attributeRepository = require('./attribute.repository');

async function getOrFail(id) {
  const attribute = await attributeRepository.findById(id);
  if (!attribute) throw ApiError.notFound('Attribute not found');
  return attribute;
}

async function getValueOrFail(attributeId, valueId) {
  await getOrFail(attributeId);
  const value = await attributeRepository.findValueById(attributeId, valueId);
  if (!value) throw ApiError.notFound('Attribute value not found');
  return value;
}

async function assertNameFree(name, excludeId = null) {
  if (await attributeRepository.nameExists(name, excludeId)) {
    throw ApiError.conflict('Attribute name already exists', { name: 'Attribute name already exists' });
  }
}

async function assertValueFree(attributeId, value, excludeId = null) {
  if (await attributeRepository.valueExists(attributeId, value, excludeId)) {
    throw ApiError.conflict('Value already exists for this attribute', { value: 'Value already exists for this attribute' });
  }
}

// Two requests can pass the checks at the same time; the DB unique indexes catch the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'attributes_name_unique') {
    return ApiError.conflict('Attribute name already exists', { name: 'Attribute name already exists' });
  }
  if (err.code === '23505' && err.constraint === 'attribute_values_value_unique') {
    return ApiError.conflict('Value already exists for this attribute', { value: 'Value already exists for this attribute' });
  }
  return err;
}

function list(filters) {
  return attributeRepository.findAll(filters);
}

// Creates the attribute, optionally with its first values: values: ["Vodafone Sim", "Airtel Sim"].
async function create(data) {
  await assertNameFree(data.name);
  const values = data.values || [];
  const duplicates = values.filter((v, i) => values.findIndex((x) => x.toLowerCase() === v.toLowerCase()) !== i);
  if (duplicates.length) {
    throw ApiError.badRequest('Validation failed', { values: `Duplicate value(s): ${[...new Set(duplicates)].join(', ')}` });
  }

  const id = await withTransaction(async (client) => {
    const attributeId = await attributeRepository.create({
      name: data.name,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    }, client);
    await attributeRepository.addValues(attributeId, values, client);
    return attributeId;
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getOrFail(id);
}

async function update(id, data) {
  await getOrFail(id);
  if (data.name !== undefined) await assertNameFree(data.name, id);
  await attributeRepository.update(id, data).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getOrFail(id);
}

async function setStatus(id, isActive) {
  await getOrFail(id);
  await attributeRepository.update(id, { is_active: isActive });
  return getOrFail(id);
}

async function remove(id) {
  await getOrFail(id);
  if ((await attributeRepository.countVariantsUsingAttribute(id)) > 0) {
    throw ApiError.conflict('Attribute is used by product combinations; remove it from those products first');
  }
  await attributeRepository.remove(id);
}

async function addValue(attributeId, data) {
  await getOrFail(attributeId);
  await assertValueFree(attributeId, data.value);
  await attributeRepository.createValue(attributeId, {
    value: data.value,
    sort_order: data.sort_order ?? 0,
    is_active: data.is_active ?? true,
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getOrFail(attributeId);
}

async function updateValue(attributeId, valueId, data) {
  await getValueOrFail(attributeId, valueId);
  if (data.value !== undefined) await assertValueFree(attributeId, data.value, valueId);
  await attributeRepository.updateValue(valueId, data).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getOrFail(attributeId);
}

async function setValueStatus(attributeId, valueId, isActive) {
  await getValueOrFail(attributeId, valueId);
  await attributeRepository.updateValue(valueId, { is_active: isActive });
  return getOrFail(attributeId);
}

async function removeValue(attributeId, valueId) {
  await getValueOrFail(attributeId, valueId);
  if ((await attributeRepository.countVariantsUsingValue(valueId)) > 0) {
    throw ApiError.conflict('Value is used by product combinations; remove those combinations first');
  }
  await attributeRepository.removeValue(valueId);
  return getOrFail(attributeId);
}

module.exports = {
  list,
  getById: getOrFail,
  create,
  update,
  setStatus,
  remove,
  addValue,
  updateValue,
  setValueStatus,
  removeValue,
};
