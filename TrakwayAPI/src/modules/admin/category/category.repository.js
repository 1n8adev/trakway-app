// SQL queries for categories. Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = `c.id, c.parent_id, p.name AS parent_name, c.name, c.slug, c.description,
  c.image, c.sort_order, c.is_active, c.created_at, c.updated_at`;

// Builds the WHERE clause for list filters: search, parentId ('root' or id), isActive.
function buildFilters({ search, parentId, isActive }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length})`);
  }
  if (parentId === 'root') {
    conditions.push('c.parent_id IS NULL');
  } else if (parentId !== undefined) {
    params.push(parentId);
    conditions.push(`c.parent_id = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`c.is_active = $${params.length}`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findAll(filters, { limit, offset }) {
  const { where, params } = buildFilters(filters);

  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS},
         (SELECT COUNT(*) FROM categories ch WHERE ch.parent_id = c.id) AS children_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ${where}
       ORDER BY c.sort_order ASC, c.name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM categories c ${where}`, params),
  ]);

  return { items: list.rows, total: count.rows[0].total };
}

// All categories (active and inactive) as a flat list, for building dropdowns/trees.
async function findAllForTree() {
  const { rows } = await db.query(
    `SELECT id, parent_id, name, slug, sort_order, is_active
     FROM categories
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${COLUMNS}
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Case-insensitive: "Men" and "men" count as the same name.
async function nameExists(name, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [name, excludeId],
  );
  return rows.length > 0;
}

async function slugExists(slug, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM categories WHERE slug = $1 AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [slug, excludeId],
  );
  return rows.length > 0;
}

// True if candidateId is the category itself or any of its descendants.
async function isSelfOrDescendant(categoryId, candidateId) {
  const { rows } = await db.query(
    `WITH RECURSIVE tree AS (
       SELECT id FROM categories WHERE id = $1
       UNION ALL
       SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
     )
     SELECT 1 FROM tree WHERE id = $2 LIMIT 1`,
    [categoryId, candidateId],
  );
  return rows.length > 0;
}

async function countChildren(id) {
  const { rows } = await db.query('SELECT COUNT(*) AS total FROM categories WHERE parent_id = $1', [id]);
  return rows[0].total;
}

async function countProducts(id) {
  const { rows } = await db.query('SELECT COUNT(*) AS total FROM products WHERE category_id = $1', [id]);
  return rows[0].total;
}

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO categories (parent_id, name, slug, description, image, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [data.parent_id, data.name, data.slug, data.description, data.image, data.sort_order, data.is_active],
  );
  return rows[0].id;
}

const UPDATABLE = ['parent_id', 'name', 'slug', 'description', 'image', 'sort_order', 'is_active'];

// Updates only the fields present in data.
async function update(id, data) {
  const fields = UPDATABLE.filter((key) => data[key] !== undefined);
  if (!fields.length) return;

  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = fields.map((key) => data[key]);
  params.push(id);

  await db.query(
    `UPDATE categories SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
}

async function remove(id) {
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
}

module.exports = {
  findAll,
  findAllForTree,
  findById,
  nameExists,
  slugExists,
  isSelfOrDescendant,
  countChildren,
  countProducts,
  create,
  update,
  remove,
};
