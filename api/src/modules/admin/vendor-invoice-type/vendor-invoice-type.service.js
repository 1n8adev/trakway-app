// Business rules for vendor invoice types. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const typeRepository = require('./vendor-invoice-type.repository');

const NAME_TAKEN = 'An invoice type with this name already exists';
const PREFIX_TAKEN = 'Another invoice type already uses this prefix';

async function findOrFail(id) {
  const type = await typeRepository.findById(id);
  if (!type) throw ApiError.notFound('Invoice type not found');
  return type;
}

// Name and prefix unique; a prefix that already appears in invoice numbers can't be reused,
// otherwise the new series would collide with those numbers.
async function assertUnique({ name, prefix }, excludeId = null) {
  const errors = {};
  if (name !== undefined && (await typeRepository.nameExists(name, excludeId))) errors.name = NAME_TAKEN;
  if (prefix !== undefined) {
    if (await typeRepository.prefixExists(prefix, excludeId)) errors.prefix = PREFIX_TAKEN;
    else if (await typeRepository.prefixUsedByInvoices(prefix, excludeId)) errors.prefix = 'This prefix is already used in existing invoice numbers';
  }
  if (Object.keys(errors).length) throw ApiError.conflict(Object.values(errors)[0], errors);
}

// Unique-index races end up here.
function uniqueError(err) {
  if (err.code === '23505' && err.constraint === 'vendor_invoice_types_name_unique') return ApiError.conflict(NAME_TAKEN, { name: NAME_TAKEN });
  if (err.code === '23505' && err.constraint === 'vendor_invoice_types_prefix_unique') return ApiError.conflict(PREFIX_TAKEN, { prefix: PREFIX_TAKEN });
  return err;
}

async function list() {
  return typeRepository.findAll();
}

async function create(data) {
  await assertUnique(data);
  try {
    return findOrFail(await typeRepository.create(data));
  } catch (err) {
    throw uniqueError(err);
  }
}

async function update(id, data) {
  const type = await findOrFail(id);
  const changes = { ...data };
  if (changes.prefix === type.prefix) delete changes.prefix;
  if (changes.prefix !== undefined && type.invoice_count > 0) {
    throw ApiError.conflict('The prefix cannot change once invoices use it', { prefix: 'Locked: invoices already use this prefix' });
  }
  if (changes.is_active === false && type.is_active && (await typeRepository.activeCount(id)) === 0) {
    throw ApiError.conflict('At least one invoice type must stay active');
  }
  await assertUnique(changes, id);
  try {
    await typeRepository.update(id, changes);
  } catch (err) {
    throw uniqueError(err);
  }
  return findOrFail(id);
}

// Types with invoices are kept (deactivate them instead).
async function remove(id) {
  const type = await findOrFail(id);
  if (type.invoice_count > 0) {
    throw ApiError.conflict(`${type.name} has ${type.invoice_count} invoice(s). Deactivate it instead.`);
  }
  if (type.is_active && (await typeRepository.activeCount(id)) === 0) {
    throw ApiError.conflict('At least one invoice type must stay active');
  }
  await typeRepository.remove(id);
}

module.exports = { list, create, update, remove, findOrFail };
