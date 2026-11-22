// Business rules for product accessories. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const accessoryRepository = require('./product-accessory.repository');

const NAME_TAKEN = 'An accessory with this name already exists';

async function findOrFail(id) {
  const accessory = await accessoryRepository.findById(id);
  if (!accessory) throw ApiError.notFound('Accessory not found');
  return accessory;
}

async function assertUnique({ name }, excludeId = null) {
  if (name !== undefined && (await accessoryRepository.nameExists(name, excludeId))) {
    throw ApiError.conflict(NAME_TAKEN, { name: NAME_TAKEN });
  }
}

// Unique-index races end up here.
function uniqueError(err) {
  if (err.code === '23505' && err.constraint === 'product_accessories_name_unique') return ApiError.conflict(NAME_TAKEN, { name: NAME_TAKEN });
  return err;
}

async function list(filters, pagination) {
  return accessoryRepository.findAll(filters, pagination);
}

async function getById(id) {
  return findOrFail(id);
}

async function create(data) {
  await assertUnique(data);
  let id;
  try {
    id = await accessoryRepository.create(data);
  } catch (err) {
    throw uniqueError(err);
  }
  return findOrFail(id);
}

// Invoices keep their own copy of name/HSN/rate/GST, so edits here never change saved invoices.
async function update(id, data) {
  await findOrFail(id);
  await assertUnique(data, id);
  try {
    await accessoryRepository.update(id, data);
  } catch (err) {
    throw uniqueError(err);
  }
  return findOrFail(id);
}

// Accessories used on invoices are kept (deactivate them instead).
async function remove(id) {
  const accessory = await findOrFail(id);
  if (accessory.invoice_count > 0) {
    throw ApiError.conflict(`${accessory.name} is on ${accessory.invoice_count} invoice(s). Deactivate it instead.`);
  }
  await accessoryRepository.remove(id);
}

module.exports = { list, getById, create, update, remove };
