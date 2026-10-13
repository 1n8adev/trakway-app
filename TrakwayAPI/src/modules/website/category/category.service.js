// Business logic for website categories.
const categoryRepository = require('./category.repository');

// Visible categories as a tree; product_count includes products in sub-categories.
async function tree() {
  const rows = await categoryRepository.findVisible();
  const byId = new Map(rows.map(({ direct_count: count, ...row }) => [row.id, { ...row, product_count: count, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent_id && byId.get(node.parent_id);
    (parent ? parent.children : roots).push(node);
  }
  const total = (node) => {
    node.product_count += node.children.reduce((sum, child) => sum + total(child), 0);
    return node.product_count;
  };
  roots.forEach(total);
  return roots;
}

module.exports = { tree };
