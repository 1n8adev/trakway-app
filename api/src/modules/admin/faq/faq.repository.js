// SQL queries for FAQs (admin). Only this layer talks to the database.
const db = require('../../../config/db');

const COLUMNS = 'id, question, answer, sort_order, is_active, created_at, updated_at';

async function findAll({ search, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(question ILIKE $${params.length} OR answer ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM faqs ${where}
       ORDER BY sort_order, id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total FROM faqs ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM faqs WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function questionExists(question, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM faqs WHERE LOWER(question) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [question, excludeId],
  );
  return rows.length > 0;
}

// Next sort_order, so a new FAQ goes to the end of the list.
async function nextSortOrder() {
  const { rows } = await db.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM faqs');
  return rows[0].next;
}

async function create({ question, answer, sort_order: sortOrder, is_active: isActive }) {
  const { rows } = await db.query(
    'INSERT INTO faqs (question, answer, sort_order, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
    [question, answer, sortOrder, isActive],
  );
  return rows[0].id;
}

// Updates only the fields present in data.
async function update(id, data) {
  const fields = ['question', 'answer', 'sort_order', 'is_active'].filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await db.query(`UPDATE faqs SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

// Sets sort_order 0, 1, 2... following the order of ids.
async function reorder(ids) {
  await db.query(
    `UPDATE faqs f SET sort_order = t.ord - 1, updated_at = NOW()
     FROM unnest($1::BIGINT[]) WITH ORDINALITY AS t(id, ord)
     WHERE f.id = t.id`,
    [ids],
  );
}

async function findExistingIds(ids) {
  const { rows } = await db.query('SELECT id FROM faqs WHERE id = ANY($1::BIGINT[])', [ids]);
  return rows.map((row) => row.id);
}

async function remove(id) {
  await db.query('DELETE FROM faqs WHERE id = $1', [id]);
}

module.exports = {
  findAll,
  findById,
  questionExists,
  nextSortOrder,
  create,
  update,
  reorder,
  findExistingIds,
  remove,
};
