// SQL queries for attributes and their values. Only this layer talks to the database.
const db = require('../../../config/db');

// All attributes, each with its values (ordered), optionally filtered by status/search.
async function findAll({ isActive, search } = {}) {
  const conditions = [];
  const params = [];
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`a.is_active = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`a.name ILIKE $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT a.id, a.name, a.sort_order, a.is_active, a.created_at, a.updated_at,
       COALESCE(
         JSON_AGG(JSON_BUILD_OBJECT('id', v.id, 'value', v.value, 'sort_order', v.sort_order, 'is_active', v.is_active)
           ORDER BY v.sort_order, v.id) FILTER (WHERE v.id IS NOT NULL),
         '[]'
       ) AS "values"
     FROM attributes a
     LEFT JOIN attribute_values v ON v.attribute_id = a.id
     ${where}
     GROUP BY a.id
     ORDER BY a.sort_order, a.name`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    'SELECT id, name, sort_order, is_active, created_at, updated_at FROM attributes WHERE id = $1',
    [id],
  );
  if (!rows[0]) return null;
  return { ...rows[0], values: await findValues(id) };
}

async function findValues(attributeId) {
  const { rows } = await db.query(
    `SELECT id, value, sort_order, is_active
     FROM attribute_values WHERE attribute_id = $1 ORDER BY sort_order, id`,
    [attributeId],
  );
  return rows;
}

async function findValueById(attributeId, valueId) {
  const { rows } = await db.query(
    'SELECT id, attribute_id, value, sort_order, is_active FROM attribute_values WHERE id = $1 AND attribute_id = $2',
    [valueId, attributeId],
  );
  return rows[0] || null;
}

async function nameExists(name, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM attributes WHERE LOWER(name) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [name, excludeId],
  );
  return rows.length > 0;
}

async function valueExists(attributeId, value, excludeId = null) {
  const { rows } = await db.query(
    `SELECT 1 FROM attribute_values
     WHERE attribute_id = $1 AND LOWER(value) = LOWER($2) AND ($3::BIGINT IS NULL OR id <> $3) LIMIT 1`,
    [attributeId, value, excludeId],
  );
  return rows.length > 0;
}

// Number of product variants using this attribute / this value.
async function countVariantsUsingAttribute(attributeId) {
  const { rows } = await db.query(
    'SELECT COUNT(*) AS total FROM product_variant_values WHERE attribute_id = $1',
    [attributeId],
  );
  return rows[0].total;
}

async function countVariantsUsingValue(valueId) {
  const { rows } = await db.query(
    'SELECT COUNT(*) AS total FROM product_variant_values WHERE attribute_value_id = $1',
    [valueId],
  );
  return rows[0].total;
}

async function create({ name, sort_order: sortOrder, is_active: isActive }, client = db.pool) {
  const { rows } = await client.query(
    'INSERT INTO attributes (name, sort_order, is_active) VALUES ($1, $2, $3) RETURNING id',
    [name, sortOrder, isActive],
  );
  return rows[0].id;
}

// Inserts values in the given order (sort_order 0, 1, 2...).
async function addValues(attributeId, values, client = db.pool) {
  if (!values.length) return;
  await client.query(
    `INSERT INTO attribute_values (attribute_id, value, sort_order)
     SELECT $1, t.value, t.ord - 1 FROM unnest($2::TEXT[]) WITH ORDINALITY AS t(value, ord)`,
    [attributeId, values],
  );
}

async function createValue(attributeId, { value, sort_order: sortOrder, is_active: isActive }) {
  const { rows } = await db.query(
    'INSERT INTO attribute_values (attribute_id, value, sort_order, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
    [attributeId, value, sortOrder, isActive],
  );
  return rows[0].id;
}

// Updates only the given fields (name/value, sort_order, is_active) of a table row.
async function updateRow(table, id, data, allowed) {
  const fields = allowed.filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await db.query(`UPDATE ${table} SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

const update = (id, data) => updateRow('attributes', id, data, ['name', 'sort_order', 'is_active']);
const updateValue = (id, data) => updateRow('attribute_values', id, data, ['value', 'sort_order', 'is_active']);

async function remove(id) {
  await db.query('DELETE FROM attributes WHERE id = $1', [id]);
}

async function removeValue(id) {
  await db.query('DELETE FROM attribute_values WHERE id = $1', [id]);
}

module.exports = {
  findAll,
  findById,
  findValueById,
  nameExists,
  valueExists,
  countVariantsUsingAttribute,
  countVariantsUsingValue,
  create,
  addValues,
  createValue,
  update,
  updateValue,
  remove,
  removeValue,
};
