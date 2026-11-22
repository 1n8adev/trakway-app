// Business rules for the product "Suppliers" tab: map supplier products to this product.
// Stock is per product — combinations draw from the same stock — so there is no per-combination mapping.
const ApiError = require('../../../utils/ApiError');
const productRepository = require('./product.repository');
const productSupplierRepository = require('./product-supplier.repository');
const mapping = require('../supplier-product/supplier-product.mapping');

async function findProductOrFail(id) {
  const product = await productRepository.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

// { supplier_products } — every supplier product with its current mapping; product_id = this product means mapped here.
async function get(productId) {
  await findProductOrFail(productId);
  return { supplier_products: await mapping.findAllWithMapping() };
}

// ids: the full set of supplier product ids mapped to this product.
async function replace(productId, ids) {
  await findProductOrFail(productId);
  const found = new Map((await mapping.findByIdsWithMapping(ids)).map((r) => [Number(r.id), r]));
  const errors = {};
  let conflict = null;
  ids.forEach((id, i) => {
    const row = found.get(id);
    const at = `supplier_product_ids.${i}`;
    if (!row) errors[at] = 'This supplier product no longer exists';
    else if (row.accessory_id || (row.product_id && Number(row.product_id) !== productId)) {
      errors[at] = `${row.name} is already mapped to ${mapping.mappedToLabel(row)}`;
      conflict = conflict || errors[at];
    }
  });
  if (conflict) throw ApiError.conflict(conflict, errors);
  if (Object.keys(errors).length) throw ApiError.badRequest('Some supplier products no longer exist; reload and try again', errors);

  await productSupplierRepository.replace(productId, ids);
  return get(productId);
}

module.exports = { get, replace };
