// Business logic for the product "Combinations" tab: priced combinations of attribute values,
// e.g. Vodafone Sim + 1 Year Recharge = 4000. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const { withTransaction } = require('../../../config/db');
const { formatVariant, summarizeAttributes } = require('../../../utils/variants');
const productRepository = require('./product.repository');
const variantRepository = require('./product-variant.repository');

const fail = (errors) => ApiError.badRequest('Validation failed', errors);

async function getForProduct(productId) {
  const variants = (await variantRepository.findByProduct(productId)).map(formatVariant);
  return { attributes: summarizeAttributes(variants), variants };
}

// Same as getForProduct, but 404 when the product doesn't exist.
async function get(productId) {
  if (!(await productRepository.findById(productId))) throw ApiError.notFound('Product not found');
  return getForProduct(productId);
}

// Replaces the product's combinations with `variants` (in the given order):
//   item with id    -> that variant is updated (id must belong to this product)
//   item without id -> a new variant is created
//   existing variants not sent are deleted
async function replace(productId, variants) {
  if (!(await productRepository.findById(productId))) throw ApiError.notFound('Product not found');

  const existingIds = new Set(await variantRepository.findIdsByProduct(productId));
  const foreignIds = variants.filter((v) => v.id !== undefined && !existingIds.has(v.id)).map((v) => v.id);
  if (foreignIds.length) {
    throw fail({ variants: `Combination id(s) ${foreignIds.join(', ')} do not belong to this product` });
  }
  const sentIds = variants.filter((v) => v.id !== undefined).map((v) => v.id);
  if (new Set(sentIds).size !== sentIds.length) throw fail({ variants: 'The same combination id is sent twice' });

  const valueIds = [...new Set(variants.flatMap((v) => v.values))];
  const valueRows = await variantRepository.findAttributeValues(valueIds);
  const valueById = new Map(valueRows.map((row) => [row.id, row]));
  const unknown = valueIds.filter((id) => !valueById.has(id));
  if (unknown.length) throw fail({ variants: `Attribute value id(s) ${unknown.join(', ')} not found` });

  const errors = {};
  let attributeSet = null;
  let attributeNames = '';
  const seenCombinations = new Map();

  const prepared = variants.map((variant, i) => {
    const key = `variants[${i}]`;
    const rows = variant.values.map((id) => valueById.get(id));

    // One value per attribute.
    const attributeIds = rows.map((row) => row.attribute_id);
    if (new Set(attributeIds).size !== attributeIds.length) {
      errors[`${key}.values`] = 'Pick only one value per attribute';
      return null;
    }

    // Every combination uses the same attributes (e.g. all have SIM + Recharge Plan).
    const set = [...attributeIds].sort((a, b) => a - b).join(',');
    if (attributeSet === null) {
      attributeSet = set;
      attributeNames = rows.map((row) => row.attribute).join(' + ');
    } else if (set !== attributeSet) {
      errors[`${key}.values`] = `Every combination must use the same attributes (${attributeNames})`;
      return null;
    }

    // No repeated combination.
    const combinationKey = [...variant.values].sort((a, b) => a - b).join('-');
    if (seenCombinations.has(combinationKey)) {
      errors[`${key}.values`] = `Same combination as variants[${seenCombinations.get(combinationKey)}]`;
      return null;
    }
    seenCombinations.set(combinationKey, i);

    return {
      id: variant.id,
      combination_key: combinationKey,
      price: variant.price,
      offer_type: variant.offer_type ?? null,
      offer_value: variant.offer_type ? variant.offer_value : null,
      sku: variant.sku || null,
      sort_order: i,
      is_active: variant.is_active ?? true,
      values: rows.map((row) => ({ attribute_id: row.attribute_id, value_id: row.id })),
    };
  });
  if (Object.keys(errors).length) throw fail(errors);

  await withTransaction(async (client) => {
    await variantRepository.removeExcept(productId, sentIds, client);
    for (const variant of prepared) {
      let variantId = variant.id;
      if (variantId) await variantRepository.update(variantId, variant, client);
      else variantId = await variantRepository.insert(productId, variant, client);
      await variantRepository.setValues(variantId, variant.values, client);
    }
    await productRepository.touch(productId, client);
  }).catch((err) => {
    if (err.code === '23505' && err.constraint === 'product_variants_sku_unique') {
      throw ApiError.conflict('SKU already used by another combination', { sku: 'SKU already used by another combination' });
    }
    throw err;
  });

  return getForProduct(productId);
}

module.exports = { get, getForProduct, replace };
