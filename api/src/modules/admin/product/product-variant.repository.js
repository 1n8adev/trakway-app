// SQL queries for product variants (attribute combinations + price). Only this layer talks to the database.
// Write functions take an optional `client` so the service can run them inside withTransaction().
const db = require('../../../config/db');

// Variants of a product, each with its attribute values ordered by attribute sort_order.
async function findByProduct(productId) {
  const { rows } = await db.query(
    `SELECT pv.id, pv.price, pv.offer_type, pv.offer_value, pv.sku, pv.sort_order, pv.is_active,
       JSON_AGG(JSON_BUILD_OBJECT(
         'attribute_id', a.id, 'attribute', a.name, 'value_id', av.id, 'value', av.value
       ) ORDER BY a.sort_order, a.id) AS "values"
     FROM product_variants pv
     JOIN product_variant_values pvv ON pvv.variant_id = pv.id
     JOIN attributes a ON a.id = pvv.attribute_id
     JOIN attribute_values av ON av.id = pvv.attribute_value_id
     WHERE pv.product_id = $1
     GROUP BY pv.id
     ORDER BY pv.sort_order, pv.id`,
    [productId],
  );
  return rows;
}

async function findIdsByProduct(productId) {
  const { rows } = await db.query('SELECT id FROM product_variants WHERE product_id = $1', [productId]);
  return rows.map((row) => row.id);
}

// Attribute values by id, with their attribute.
async function findAttributeValues(valueIds) {
  const { rows } = await db.query(
    `SELECT av.id, av.value, av.attribute_id, a.name AS attribute
     FROM attribute_values av JOIN attributes a ON a.id = av.attribute_id
     WHERE av.id = ANY($1::BIGINT[])`,
    [valueIds],
  );
  return rows;
}

// Deletes the product's variants whose id is not in keepIds.
async function removeExcept(productId, keepIds, client = db.pool) {
  await client.query(
    'DELETE FROM product_variants WHERE product_id = $1 AND NOT (id = ANY($2::BIGINT[]))',
    [productId, keepIds],
  );
}

async function insert(productId, variant, client = db.pool) {
  const { rows } = await client.query(
    `INSERT INTO product_variants
       (product_id, combination_key, price, offer_type, offer_value, sku, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [productId, variant.combination_key, variant.price, variant.offer_type, variant.offer_value,
      variant.sku, variant.sort_order, variant.is_active],
  );
  return rows[0].id;
}

async function update(id, variant, client = db.pool) {
  await client.query(
    `UPDATE product_variants
     SET combination_key = $1, price = $2, offer_type = $3, offer_value = $4, sku = $5,
       sort_order = $6, is_active = $7, updated_at = NOW()
     WHERE id = $8`,
    [variant.combination_key, variant.price, variant.offer_type, variant.offer_value,
      variant.sku, variant.sort_order, variant.is_active, id],
  );
}

// Replaces the attribute values of one variant: values = [{ attribute_id, value_id }].
async function setValues(variantId, values, client = db.pool) {
  await client.query('DELETE FROM product_variant_values WHERE variant_id = $1', [variantId]);
  await client.query(
    `INSERT INTO product_variant_values (variant_id, attribute_id, attribute_value_id)
     SELECT $1, t.attribute_id, t.value_id FROM unnest($2::BIGINT[], $3::BIGINT[]) AS t(attribute_id, value_id)`,
    [variantId, values.map((v) => v.attribute_id), values.map((v) => v.value_id)],
  );
}

module.exports = { findByProduct, findIdsByProduct, findAttributeValues, removeExcept, insert, update, setValues };
