// SQL queries for website categories. Only this layer talks to the database.
const db = require('../../../config/db');
const { VISIBLE_CATEGORIES_CTE, visibleProduct } = require('../visibility');

// Visible categories with the number of visible products directly in each.
async function findVisible() {
  const { rows } = await db.query(
    `WITH RECURSIVE ${VISIBLE_CATEGORIES_CTE}
     SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.image, c.sort_order,
       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND ${visibleProduct('p')}) AS direct_count
     FROM categories c
     WHERE c.id IN (SELECT id FROM visible_categories)
     ORDER BY c.sort_order, c.name`,
  );
  return rows;
}

module.exports = { findVisible };
