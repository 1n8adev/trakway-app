// SQL fragments deciding what the public website may show. Used by website repositories.

// CTE "visible_categories": active categories whose every ancestor is active too.
const VISIBLE_CATEGORIES_CTE = `visible_categories AS (
  SELECT id FROM categories WHERE parent_id IS NULL AND is_active
  UNION ALL
  SELECT c.id FROM categories c JOIN visible_categories vc ON c.parent_id = vc.id WHERE c.is_active
)`;

// A product is visible when it is active and its category is visible (needs VISIBLE_CATEGORIES_CTE).
const visibleProduct = (alias) => `${alias}.is_active
  AND ${alias}.category_id IN (SELECT id FROM visible_categories)`;

// A variant is sellable when it is active and none of its attributes / values is inactive.
const sellableVariant = (alias) => `${alias}.is_active AND NOT EXISTS (
  SELECT 1 FROM product_variant_values pvv
  JOIN attributes a ON a.id = pvv.attribute_id
  JOIN attribute_values av ON av.id = pvv.attribute_value_id
  WHERE pvv.variant_id = ${alias}.id AND (NOT a.is_active OR NOT av.is_active)
)`;

module.exports = { VISIBLE_CATEGORIES_CTE, visibleProduct, sellableVariant };
