// Business logic for suppliers. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const supplierRepository = require('./supplier.repository');
const supplierProductRepository = require('../supplier-product/supplier-product.repository');

const GSTIN_TAKEN = 'A supplier with this GSTIN already exists';

async function findOrFail(id) {
  const supplier = await supplierRepository.findById(id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
}

async function assertUnique({ gstin }, excludeId = null) {
  if (gstin && (await supplierRepository.gstinExists(gstin, excludeId))) {
    throw ApiError.conflict(GSTIN_TAKEN, { gstin: GSTIN_TAKEN });
  }
}

// Two requests can pass assertUnique at the same time; the DB unique index catches the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'suppliers_gstin_unique') {
    return ApiError.conflict(GSTIN_TAKEN, { gstin: GSTIN_TAKEN });
  }
  return err;
}

async function list(filters, pagination) {
  return supplierRepository.findAll(filters, pagination);
}

async function getById(id) {
  return findOrFail(id);
}

async function create(data) {
  await assertUnique(data);
  const id = await supplierRepository.create({
    contact_person: null,
    email: null,
    gstin: null,
    notes: null,
    is_active: true,
    ...data,
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getById(id);
}

async function update(id, data) {
  await findOrFail(id);
  await assertUnique(data, id);
  await supplierRepository.update(id, data).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getById(id);
}

// Suppliers with products (and so any purchases) are kept; deactivate them instead.
async function remove(id) {
  await findOrFail(id);
  const products = await supplierProductRepository.countBySupplier(id);
  if (products > 0) {
    throw ApiError.conflict(`Supplier has ${products} product(s); delete them or deactivate the supplier instead`);
  }
  await supplierRepository.remove(id);
}

module.exports = { list, getById, create, update, remove };
