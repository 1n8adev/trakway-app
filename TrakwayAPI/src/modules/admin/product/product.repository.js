// SQL queries for products. Only this layer talks to the database.
// Write functions take an optional `client` so the service can run them inside withTransaction().
const db = require('../../../config/db');
const { finalPriceSql } = require('../../../utils/pricing');

const COLUMNS = `p.id, p.category_id, c.name AS category_name, p.name, p.slug, p.feature,
  p.short_description, p.long_description, p.feature_list, p.price, p.offer_type, p.offer_value,
  p.specifications, p.package_details, p.box_contents, p.sort_order, p.is_active,
  p.created_at, p.updated_at`;

// Builds the WHERE clause for list filters: search, categoryId, isActive.
function buildFilters({ search, categoryId, isActive }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.slug ILIKE $${params.length} OR p.feature ILIKE $${params.length})`);
  }
  if (categoryId !== undefined) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`p.is_active = $${params.length}`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findAll(filters, { limit, offset }) {
  const { where, params } = buildFilters(filters);

  const [list, count] = await Promise.all([
    db.query(
      `SELECT p.id, p.category_id, c.name AS category_name, p.name, p.slug, p.feature,
         p.short_description, p.price, p.offer_type, p.offer_value,
         p.sort_order, p.is_active, p.created_at, p.updated_at,
         (SELECT pi.image FROM product_images pi
           WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS main_image,
         (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
         (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) AS variant_count,
         (SELECT MIN(${finalPriceSql('pv')}) FROM product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active) AS min_variant_price,
         (SELECT MAX(${finalPriceSql('pv')}) FROM product_variants pv
           WHERE pv.product_id = p.id AND pv.is_active) AS max_variant_price
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.sort_order ASC, p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM products p ${where}`, params),
  ]);

  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS}
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function findImages(productId) {
  const { rows } = await db.query(
    'SELECT id, image, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
    [productId],
  );
  return rows;
}

async function findBenefits(productId) {
  const { rows } = await db.query(
    `SELECT id, title, description, image, sort_order
     FROM product_benefits WHERE product_id = $1 ORDER BY sort_order, id`,
    [productId],
  );
  return rows;
}

// Case-insensitive: "GPS Tracker" and "gps tracker" count as the same name.
async function nameExists(name, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM products WHERE LOWER(name) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [name, excludeId],
  );
  return rows.length > 0;
}

async function slugExists(slug, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM products WHERE slug = $1 AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [slug, excludeId],
  );
  return rows.length > 0;
}

// JSONB columns must be sent as JSON strings (pg would otherwise send JS arrays as Postgres arrays).
const JSON_COLUMNS = new Set(['feature_list', 'specifications']);
const toParam = (key, value) => (JSON_COLUMNS.has(key) ? JSON.stringify(value) : value);

const INSERTABLE = ['category_id', 'name', 'slug', 'feature', 'short_description', 'long_description',
  'feature_list', 'price', 'offer_type', 'offer_value',
  'specifications', 'package_details', 'box_contents', 'sort_order', 'is_active'];

async function create(data, client = db.pool) {
  const placeholders = INSERTABLE.map((_, i) => `$${i + 1}`);
  const { rows } = await client.query(
    `INSERT INTO products (${INSERTABLE.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING id`,
    INSERTABLE.map((key) => toParam(key, data[key])),
  );
  return rows[0].id;
}

const UPDATABLE = INSERTABLE;

// Updates only the fields present in data.
async function update(id, data, client = db.pool) {
  const fields = UPDATABLE.filter((key) => data[key] !== undefined);
  if (!fields.length) return;

  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = fields.map((key) => toParam(key, data[key]));
  params.push(id);

  await client.query(
    `UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
}

// Bumps updated_at when only images/benefits changed.
async function touch(id, client = db.pool) {
  await client.query('UPDATE products SET updated_at = NOW() WHERE id = $1', [id]);
}

async function addImages(productId, images, startOrder, client = db.pool) {
  if (!images.length) return;
  await client.query(
    `INSERT INTO product_images (product_id, image, sort_order)
     SELECT $1, t.image, $2 + t.ord - 1
     FROM unnest($3::TEXT[]) WITH ORDINALITY AS t(image, ord)`,
    [productId, startOrder, images],
  );
}

async function removeImages(productId, imageIds, client = db.pool) {
  if (!imageIds.length) return;
  await client.query('DELETE FROM product_images WHERE product_id = $1 AND id = ANY($2::BIGINT[])', [productId, imageIds]);
}

// Replaces all benefits of a product with `benefits` (in the given order).
async function replaceBenefits(productId, benefits, client = db.pool) {
  await client.query('DELETE FROM product_benefits WHERE product_id = $1', [productId]);
  if (!benefits.length) return;
  await client.query(
    `INSERT INTO product_benefits (product_id, title, description, image, sort_order)
     SELECT $1, t.title, t.description, t.image, t.ord - 1
     FROM unnest($2::TEXT[], $3::TEXT[], $4::TEXT[]) WITH ORDINALITY AS t(title, description, image, ord)`,
    [productId, benefits.map((b) => b.title), benefits.map((b) => b.description), benefits.map((b) => b.image)],
  );
}

async function remove(id) {
  await db.query('DELETE FROM products WHERE id = $1', [id]);
}

module.exports = {
  findAll,
  findById,
  findImages,
  findBenefits,
  nameExists,
  slugExists,
  create,
  update,
  touch,
  addImages,
  removeImages,
  replaceBenefits,
  remove,
};
