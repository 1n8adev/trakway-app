// Business rules for product accessories. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const accessoryRepository = require('./product-accessory.repository');
const { mappedToLabel } = require('../supplier-product/supplier-product.mapping');

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

// Supplier products must exist and not already be mapped to a different accessory or to a product
// (unmap them there first — a supplier product is one Trakway item).
async function assertMappable(ids, accessoryId = null) {
  if (!ids?.length) return;
  const found = await accessoryRepository.supplierProductsByIds(ids);
  if (found.length !== ids.length) {
    throw ApiError.badRequest('Some supplier products no longer exist', { supplier_product_ids: 'Some supplier products no longer exist; reload and try again' });
  }
  const taken = found.filter((sp) => sp.product_id || (sp.accessory_id && Number(sp.accessory_id) !== Number(accessoryId)));
  if (taken.length) {
    const list = taken.map((sp) => `${sp.name} (mapped to ${mappedToLabel(sp)})`).join(', ');
    throw ApiError.conflict(`Already mapped elsewhere: ${list}`, { supplier_product_ids: `Already mapped elsewhere: ${list}` });
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

// Adds supplier_products: the supplier products mapped to it.
async function getById(id) {
  const accessory = await findOrFail(id);
  return { ...accessory, supplier_products: await accessoryRepository.findSupplierProducts(id) };
}

// For the accessory form's "Supplier products" picker.
async function mappableSupplierProducts() {
  return accessoryRepository.mappableSupplierProducts();
}

// data may carry supplier_product_ids (the full mapped set).
async function create({ supplier_product_ids: ids, ...data }) {
  await assertUnique(data);
  await assertMappable(ids);
  let id;
  try {
    id = await accessoryRepository.create(data, ids);
  } catch (err) {
    throw uniqueError(err);
  }
  return getById(id);
}

// Invoices keep their own copy of name/HSN/rate/GST, so edits here never change saved invoices.
async function update(id, { supplier_product_ids: ids, ...data }) {
  await findOrFail(id);
  await assertUnique(data, id);
  await assertMappable(ids, id);
  try {
    await accessoryRepository.update(id, data, ids);
  } catch (err) {
    throw uniqueError(err);
  }
  return getById(id);
}

// Accessories used on invoices are kept (deactivate them instead). Mapped supplier products are just unmapped.
async function remove(id) {
  const accessory = await findOrFail(id);
  if (accessory.invoice_count > 0) {
    throw ApiError.conflict(`${accessory.name} is on ${accessory.invoice_count} invoice(s). Deactivate it instead.`);
  }
  await accessoryRepository.remove(id);
}

module.exports = { list, getById, mappableSupplierProducts, create, update, remove };
