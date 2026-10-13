// Shapes product variants (attribute combinations) for responses. Shared by admin and website.
const { pricing } = require('./pricing');

// Adds a readable label ("Vodafone Sim + 1 Year Recharge") and computed prices to a variant row.
const formatVariant = (variant) => ({
  ...variant,
  ...pricing(variant),
  label: variant.values.map((v) => v.value).join(' + '),
});

// Groups the values used by the variants per attribute — what the website shows as option buttons:
// [{ attribute_id, attribute, values: [{ value_id, value }] }]
// Rows may carry attribute_sort_order / value_sort_order; when present, groups and values follow them.
function summarizeAttributes(variants) {
  const byAttribute = new Map();
  for (const variant of variants) {
    for (const v of variant.values) {
      if (!byAttribute.has(v.attribute_id)) {
        byAttribute.set(v.attribute_id, {
          attribute_id: v.attribute_id,
          attribute: v.attribute,
          sort: v.attribute_sort_order ?? 0,
          values: new Map(),
        });
      }
      byAttribute.get(v.attribute_id).values.set(v.value_id, {
        value_id: v.value_id,
        value: v.value,
        sort: v.value_sort_order ?? 0,
      });
    }
  }
  const bySort = (a, b) => a.sort - b.sort;
  return [...byAttribute.values()].sort(bySort).map(({ sort, values, ...attribute }) => ({
    ...attribute,
    values: [...values.values()].sort(bySort).map(({ sort: _s, ...value }) => value),
  }));
}

module.exports = { formatVariant, summarizeAttributes };
