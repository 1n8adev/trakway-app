// Business rules for supplier products. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const supplierProductRepository = require('./supplier-product.repository');

const NAME_TAKEN = 'This supplier already has a product with this name';

async function findOrFail(id) {
  const product = await supplierProductRepository.findById(id);
  if (!product) throw ApiError.notFound('Supplier product not found');
  return product;
}

async function assertUnique(supplierId, { name }, excludeId = null) {
  if (name !== undefined && (await supplierProductRepository.nameExists(supplierId, name, excludeId))) {
    throw ApiError.conflict(NAME_TAKEN, { name: NAME_TAKEN });
  }
}

// Unique-index races end up here.
function uniqueError(err) {
  if (err.code === '23505' && err.constraint === 'supplier_products_name_unique') return ApiError.conflict(NAME_TAKEN, { name: NAME_TAKEN });
  return err;
}

async function list(filters, pagination) {
  return supplierProductRepository.findAll(filters, pagination);
}

async function getById(id) {
  return findOrFail(id);
}

// New products only go under an active supplier.
async function create(data) {
  const supplier = await supplierProductRepository.findSupplier(data.supplier_id);
  if (!supplier) throw ApiError.badRequest('Supplier not found', { supplier_id: 'Select a supplier' });
  if (!supplier.is_active) {
    throw ApiError.badRequest(`${supplier.name} is inactive`, { supplier_id: 'This supplier is inactive; activate it first' });
  }
  await assertUnique(data.supplier_id, data);
  let id;
  try {
    id = await supplierProductRepository.create(data);
  } catch (err) {
    throw uniqueError(err);
  }
  return findOrFail(id);
}

async function update(id, data) {
  const product = await findOrFail(id);
  await assertUnique(product.supplier_id, data, id);
  try {
    await supplierProductRepository.update(id, data);
  } catch (err) {
    throw uniqueError(err);
  }
  return findOrFail(id);
}

// Products on purchases are kept for the records; deactivate them instead.
async function remove(id) {
  const product = await findOrFail(id);
  if (product.purchase_count > 0) {
    throw ApiError.conflict(`${product.name} is on ${product.purchase_count} purchase(s). Deactivate it instead.`);
  }
  await supplierProductRepository.remove(id);
}

module.exports = { list, getById, create, update, remove };
