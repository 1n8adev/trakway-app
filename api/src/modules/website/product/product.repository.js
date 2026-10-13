// SQL queries for website products. Only this layer talks to the database.
// Every query shows visible products only (see ../visibility.js).
const db = require('../../../config/db');
const { finalPriceSql } = require('../../../utils/pricing');
const { VISIBLE_CATEGORIES_CTE, visibleProduct, sellableVariant } = require('../visibility');

// Fields for product cards (home, list).
const CARD_COLUMNS = `p.id, p.name, p.slug, p.feature, p.short_description,
  p.price, p.offer_type, p.offer_value,
  c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
  (SELECT pi.image FROM product_images pi
    WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS main_image,
  (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND ${sellableVariant('pv')}) AS variant_count,
  (SELECT MIN(${finalPriceSql('pv')}) FROM product_variants pv
    WHERE pv.product_id = p.id AND ${sellableVariant('pv')}) AS min_variant_price,
  (SELECT MAX(${finalPriceSql('pv')}) FROM product_variants pv
    WHERE pv.product_id = p.id AND ${sellableVariant('pv')}) AS max_variant_price`;

// Newest visible products (home page).
async function findLatest(limit) {
  const { rows } = await db.query(
    `WITH RECURSIVE ${VISIBLE_CATEGORIES_CTE}
     SELECT ${CARD_COLUMNS}
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE ${visibleProduct('p')}
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

// Products page: optional category (by slug, including its sub-categories) and search.
async function findAll({ categorySlug, search }, { limit, offset }) {
  const params = [];
  const conditions = [visibleProduct('p')];
  let filterCte = '';

  if (categorySlug) {
    params.push(categorySlug);
    filterCte = `, filter_categories AS (
      SELECT id FROM categories WHERE slug = $${params.length} AND id IN (SELECT id FROM visible_categories)
      UNION ALL
      SELECT c.id FROM categories c JOIN filter_categories f ON c.parent_id = f.id
      WHERE c.id IN (SELECT id FROM visible_categories)
    )`;
    conditions.push('p.category_id IN (SELECT id FROM filter_categories)');
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.feature ILIKE $${params.length})`);
  }

  const withClause = `WITH RECURSIVE ${VISIBLE_CATEGORIES_CTE}${filterCte}`;
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [list, count] = await Promise.all([
    db.query(
      `${withClause}
       SELECT ${CARD_COLUMNS}
       FROM products p JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.sort_order ASC, p.created_at DESC, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`${withClause} SELECT COUNT(*) AS total FROM products p ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

// Details page.
async function findBySlug(slug) {
  const { rows } = await db.query(
    `WITH RECURSIVE ${VISIBLE_CATEGORIES_CTE}
     SELECT p.id, p.name, p.slug, p.feature, p.short_description, p.long_description, p.feature_list,
       p.price, p.offer_type, p.offer_value, p.specifications, p.package_details, p.box_contents,
       c.id AS category_id, c.name AS category_name, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1 AND ${visibleProduct('p')}`,
    [slug],
  );
  return rows[0] || null;
}

async function findImages(productId) {
  const { rows } = await db.query(
    'SELECT id, image FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
    [productId],
  );
  return rows;
}

async function findBenefits(productId) {
  const { rows } = await db.query(
    'SELECT id, title, description, image FROM product_benefits WHERE product_id = $1 ORDER BY sort_order, id',
    [productId],
  );
  return rows;
}

// Sellable combinations, with the sort orders the option buttons follow.
async function findVariants(productId) {
  const { rows } = await db.query(
    `SELECT pv.id, pv.price, pv.offer_type, pv.offer_value, pv.sku,
       JSON_AGG(JSON_BUILD_OBJECT(
         'attribute_id', a.id, 'attribute', a.name, 'attribute_sort_order', a.sort_order,
         'value_id', av.id, 'value', av.value, 'value_sort_order', av.sort_order
       ) ORDER BY a.sort_order, a.id) AS "values"
     FROM product_variants pv
     JOIN product_variant_values pvv ON pvv.variant_id = pv.id
     JOIN attributes a ON a.id = pvv.attribute_id
     JOIN attribute_values av ON av.id = pvv.attribute_value_id
     WHERE pv.product_id = $1 AND ${sellableVariant('pv')}
     GROUP BY pv.id
     ORDER BY pv.sort_order, pv.id`,
    [productId],
  );
  return rows;
}

module.exports = { findLatest, findAll, findBySlug, findImages, findBenefits, findVariants };
