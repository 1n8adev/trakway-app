// Business logic for vendors. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const vendorRepository = require('./vendor.repository');

const GSTIN_TAKEN = 'A vendor with this GSTIN already exists';

async function findOrFail(id) {
  const vendor = await vendorRepository.findById(id);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return vendor;
}

async function assertUnique({ gstin }, excludeId = null) {
  if (gstin && (await vendorRepository.gstinExists(gstin, excludeId))) {
    throw ApiError.conflict(GSTIN_TAKEN, { gstin: GSTIN_TAKEN });
  }
}

// Two requests can pass assertUnique at the same time; the DB unique index catches the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'vendors_gstin_unique') {
    return ApiError.conflict(GSTIN_TAKEN, { gstin: GSTIN_TAKEN });
  }
  return err;
}

async function list(filters, pagination) {
  return vendorRepository.findAll(filters, pagination);
}

async function getById(id) {
  return findOrFail(id);
}

async function create(data) {
  await assertUnique(data);
  const id = await vendorRepository.create({
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
  await vendorRepository.update(id, data).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getById(id);
}

// Vendors with invoices are kept for the records; deactivate them instead.
async function remove(id) {
  await findOrFail(id);
  if ((await vendorRepository.countInvoices(id)) > 0) {
    throw ApiError.conflict('Vendor has invoices; deactivate the vendor instead of deleting');
  }
  await vendorRepository.remove(id);
}

module.exports = { list, getById, create, update, remove };
