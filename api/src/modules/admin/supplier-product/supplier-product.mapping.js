// Shared SQL for "what Trakway item is this supplier product" (an accessory or a product).
// Used by the supplier products list, the accessory form's picker and the product "Suppliers" tab.
const db = require('../../../config/db');

// Columns for a supplier product aliased `t` (default sp).
const mappingColumns = (t = 'sp') => `${t}.accessory_id, (SELECT a.name FROM product_accessories a WHERE a.id = ${t}.accessory_id) AS accessory_name,
  ${t}.product_id, (SELECT pr.name FROM products pr WHERE pr.id = ${t}.product_id) AS product_name`;

// Every supplier product with its supplier and current mapping (pickers).
async function findAllWithMapping() {
  const { rows } = await db.query(
    `SELECT sp.id, sp.name, sp.price, sp.hsn_code, sp.gst_rate, sp.is_active, sp.supplier_id, s.name AS supplier_name,
            s.is_active AS supplier_is_active, ${mappingColumns()}
     FROM supplier_products sp JOIN suppliers s ON s.id = sp.supplier_id
     ORDER BY s.name, sp.name`,
  );
  return rows;
}

// Same rows for the given ids.
async function findByIdsWithMapping(ids) {
  if (!ids.length) return [];
  const { rows } = await db.query(
    `SELECT sp.id, sp.name, ${mappingColumns()} FROM supplier_products sp WHERE sp.id = ANY($1::BIGINT[])`,
    [ids],
  );
  return rows;
}

// "accessory Relay" / "product Trakway 4G GPS" — for conflict messages.
function mappedToLabel(row) {
  if (row.accessory_id) return `accessory ${row.accessory_name}`;
  if (row.product_id) return `product ${row.product_name}`;
  return null;
}

module.exports = { mappingColumns, findAllWithMapping, findByIdsWithMapping, mappedToLabel };
