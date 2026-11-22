// Business rules for purchases (supplier bills). Throws ApiError on rule violations.
const fs = require('fs');
const env = require('../../../config/env');
const ApiError = require('../../../utils/ApiError');
const { privateFilePath, removePrivateFile } = require('../../../utils/file');
const purchaseRepository = require('./purchase.repository');
const { calculate } = require('../vendor-invoice/vendor-invoice.service');

const BILL_TAKEN = 'This bill number is already entered for this supplier';

// The storage key is never sent to the client; bill_file_url is the authenticated download route.
function format({ bill_file: billFile, ...purchase }) {
  return {
    ...purchase,
    has_bill_file: Boolean(billFile),
    bill_file_url: billFile ? `/api/admin/purchases/${purchase.id}/bill` : null,
  };
}

async function findOrFail(id) {
  const purchase = await purchaseRepository.findById(id);
  if (!purchase) throw ApiError.notFound('Purchase not found');
  return purchase;
}

async function getById(id) {
  const purchase = await findOrFail(id);
  return { ...format(purchase), items: await purchaseRepository.findItems(id) };
}

async function list(filters, pagination) {
  const result = await purchaseRepository.findAll(filters, pagination);
  return { ...result, items: result.items.map(format) };
}

async function options() {
  return { ...(await purchaseRepository.options()), seller_state: env.invoice.sellerState };
}

// Checks the lines against the supplier's products and prices them. A line may keep a product
// that has since been deactivated only if it was already on this purchase (keepIds).
async function build(supplier, body, keepIds = new Set()) {
  const ids = body.items.map((item) => item.supplier_product_id);
  const products = new Map((await purchaseRepository.findSupplierProducts(ids)).map((p) => [Number(p.id), p]));
  const errors = {};
  body.items.forEach((item, i) => {
    const product = products.get(item.supplier_product_id);
    const at = `items.${i}.supplier_product_id`;
    if (!product || Number(product.supplier_id) !== Number(supplier.id)) errors[at] = `Not a product of ${supplier.name}`;
    else if (!product.is_active && !keepIds.has(item.supplier_product_id)) errors[at] = `${product.name} is inactive`;
  });
  if (Object.keys(errors).length) throw ApiError.badRequest('Some lines need attention', errors);

  const intraState = supplier.state === env.invoice.sellerState;
  const { lines, totals } = calculate(
    body.items.map((item) => {
      const product = products.get(item.supplier_product_id);
      return {
        supplier_product_id: item.supplier_product_id,
        name: product.name,
        hsn_code: product.hsn_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: Number(product.gst_rate),
      };
    }),
    intraState,
  );
  return { purchase: { bill_no: body.bill_no, bill_date: body.bill_date, notes: body.notes ?? null, intra_state: intraState, ...totals }, lines };
}

function uniqueError(err) {
  if (err.code === '23505' && err.constraint === 'purchases_bill_unique') return ApiError.conflict(BILL_TAKEN, { bill_no: BILL_TAKEN });
  return err;
}

// Purchases go under an active supplier only.
async function create(body, adminId) {
  const supplier = await purchaseRepository.findSupplier(body.supplier_id);
  if (!supplier) throw ApiError.badRequest('Supplier not found', { supplier_id: 'Select a supplier' });
  if (!supplier.is_active) throw ApiError.badRequest(`${supplier.name} is inactive`, { supplier_id: 'This supplier is inactive' });
  if (await purchaseRepository.billExists(supplier.id, body.bill_no)) throw ApiError.conflict(BILL_TAKEN, { bill_no: BILL_TAKEN });
  const { purchase, lines } = await build(supplier, body);
  let id;
  try {
    id = await purchaseRepository.create(
      { ...purchase, supplier_id: supplier.id, bill_file: body.bill_file ?? null, bill_file_name: body.bill_file_name ?? null, created_by: adminId },
      lines,
    );
  } catch (err) {
    throw uniqueError(err);
  }
  return getById(id);
}

// Edits keep the supplier. A new upload replaces the stored bill; remove_bill_file clears it.
async function update(id, body) {
  const existing = await findOrFail(id);
  const supplier = await purchaseRepository.findSupplier(existing.supplier_id);
  if (await purchaseRepository.billExists(supplier.id, body.bill_no, id)) throw ApiError.conflict(BILL_TAKEN, { bill_no: BILL_TAKEN });
  const keepIds = new Set((await purchaseRepository.findItems(id)).map((item) => Number(item.supplier_product_id)));
  const { purchase, lines } = await build(supplier, body, keepIds);

  let billFile;
  if (body.bill_file) billFile = { key: body.bill_file, name: body.bill_file_name };
  else if (body.remove_bill_file) billFile = null;
  try {
    await purchaseRepository.update(id, purchase, lines, billFile);
  } catch (err) {
    throw uniqueError(err);
  }
  if (billFile !== undefined && existing.bill_file) removePrivateFile(existing.bill_file);
  return getById(id);
}

async function remove(id) {
  const purchase = await findOrFail(id);
  await purchaseRepository.remove(id);
  if (purchase.bill_file) removePrivateFile(purchase.bill_file);
}

// { path, name } of the stored bill (404 if none / missing on disk).
async function billFile(id) {
  const purchase = await findOrFail(id);
  const filePath = privateFilePath(purchase.bill_file);
  if (!filePath || !fs.existsSync(filePath)) throw ApiError.notFound('No bill file for this purchase');
  return { path: filePath, name: purchase.bill_file_name || `${purchase.bill_no}${filePath.slice(filePath.lastIndexOf('.'))}` };
}

module.exports = { list, getById, options, create, update, remove, billFile };
