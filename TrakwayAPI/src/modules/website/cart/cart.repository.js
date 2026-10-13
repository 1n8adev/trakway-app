// SQL queries for the customer cart. Only this layer talks to the database.
// Availability uses the website visibility rules, so the cart never sells what the shop hides.
const db = require('../../../config/db');
const { VISIBLE_CATEGORIES_CTE, visibleProduct, sellableVariant } = require('../visibility');

// Cart lines with everything needed to price them. Pass lock=true inside a transaction (checkout)
// to lock the user's cart rows so the same cart can't be ordered twice at once.
async function findLines(userId, { client = db.pool, lock = false } = {}) {
  const { rows } = await client.query(
    `WITH RECURSIVE ${VISIBLE_CATEGORIES_CTE}
     SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity, ci.created_at,
       p.name, p.slug, p.price AS product_price, p.offer_type AS product_offer_type, p.offer_value AS product_offer_value,
       (${visibleProduct('p')}) AS product_visible,
       EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND ${sellableVariant('v')}) AS has_variants,
       (SELECT pi.image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image,
       pv.price AS variant_price, pv.offer_type AS variant_offer_type, pv.offer_value AS variant_offer_value, pv.sku,
       (pv.id IS NOT NULL AND ${sellableVariant('pv')}) AS variant_sellable,
       (SELECT STRING_AGG(xv.value, ' + ' ORDER BY xa.sort_order, xa.id)
          FROM product_variant_values x
          JOIN attributes xa ON xa.id = x.attribute_id
          JOIN attribute_values xv ON xv.id = x.attribute_value_id
         WHERE x.variant_id = pv.id) AS variant_label
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_variants pv ON pv.id = ci.variant_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at, ci.id
     ${lock ? 'FOR UPDATE OF ci' : ''}`,
    [userId],
  );
  return rows;
}

// What add-to-cart needs to know about a product (and optionally one of its combinations).
async function findPurchasable(productId, variantId) {
  const { rows } = await db.query(
    `WITH RECURSIVE ${VISIBLE_CATEGORIES_CTE}
     SELECT p.id, p.price,
       (${visibleProduct('p')}) AS visible,
       EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND ${sellableVariant('v')}) AS has_variants,
       (SELECT ${sellableVariant('pv')} FROM product_variants pv WHERE pv.id = $2 AND pv.product_id = p.id) AS variant_sellable
     FROM products p WHERE p.id = $1`,
    [productId, variantId],
  );
  return rows[0] || null;
}

async function findLine(userId, id) {
  const { rows } = await db.query('SELECT id, quantity FROM cart_items WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0] || null;
}

// Adds quantity to the line for this product/combination (created if missing), capped at maxQuantity.
async function addQuantity(userId, productId, variantId, quantity, maxQuantity) {
  const { rows } = await db.query(
    `INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
     VALUES ($1, $2, $3, LEAST($4::INT, $5::INT))
     ON CONFLICT (user_id, product_id, COALESCE(variant_id, 0))
     DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $5::INT), updated_at = NOW()
     RETURNING id, quantity`,
    [userId, productId, variantId, quantity, maxQuantity],
  );
  return rows[0];
}

async function setQuantity(id, quantity) {
  await db.query('UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2', [quantity, id]);
}

async function removeLine(id) {
  await db.query('DELETE FROM cart_items WHERE id = $1', [id]);
}

async function clear(userId, client = db.pool) {
  await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

module.exports = { findLines, findPurchasable, findLine, addQuantity, setQuantity, removeLine, clear };
