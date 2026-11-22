// Available stock, calculated from the documents (no separate ledger yet):
//   product   = purchased (supplier products mapped to it) − vendor invoice lines (issued) − website order lines (not cancelled)
//   accessory = purchased (supplier products mapped to it) − vendor invoice lines (issued)
// Stock is per product: every combination of a product draws from the same stock.
// Purchases count through the supplier product's *current* mapping (remapping moves its history too).
// excludeInvoiceId leaves one vendor invoice out (its own lines while it is being edited).
const db = require('../../../config/db');

const PURCHASED = (key) => `COALESCE((
  SELECT SUM(pi.quantity) FROM purchase_items pi JOIN supplier_products sp ON sp.id = pi.supplier_product_id
  WHERE sp.${key} = x.id), 0)`;

const INVOICED = (key) => `COALESCE((
  SELECT SUM(it.quantity) FROM vendor_invoice_items it JOIN vendor_invoices i ON i.id = it.invoice_id
  WHERE it.${key} = x.id AND i.status = 'issued' AND i.id IS DISTINCT FROM $1::BIGINT), 0)`;

const ORDERED = `COALESCE((
  SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = x.id AND o.status <> 'cancelled'), 0)`;

const SUPPLIER_PRODUCTS = (key) => `(SELECT COUNT(*) FROM supplier_products sp WHERE sp.${key} = x.id)::INT`;

// { [productId]: stock } for every product.
async function productStock(excludeInvoiceId = null) {
  const { rows } = await db.query(
    `SELECT x.id, ${PURCHASED('product_id')} - ${INVOICED('product_id')} - ${ORDERED} AS stock FROM products x`,
    [excludeInvoiceId],
  );
  return Object.fromEntries(rows.map((r) => [r.id, Number(r.stock)]));
}

// { [accessoryId]: stock } for every accessory.
async function accessoryStock(excludeInvoiceId = null) {
  const { rows } = await db.query(
    `SELECT x.id, ${PURCHASED('accessory_id')} - ${INVOICED('accessory_id')} AS stock FROM product_accessories x`,
    [excludeInvoiceId],
  );
  return Object.fromEntries(rows.map((r) => [r.id, Number(r.stock)]));
}

// Stock page rows: every product and accessory with its in / out totals.
async function overview() {
  const [products, accessories] = await Promise.all([
    db.query(
      `SELECT 'product' AS type, x.id, x.name, x.is_active,
         (SELECT pi.image FROM product_images pi WHERE pi.product_id = x.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image,
         (SELECT c.name FROM categories c WHERE c.id = x.category_id) AS subtitle,
         ${PURCHASED('product_id')} AS purchased, ${INVOICED('product_id')} AS invoiced, ${ORDERED} AS ordered,
         ${SUPPLIER_PRODUCTS('product_id')} AS supplier_product_count,
         (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = x.id AND v.is_active)::INT AS variant_count
       FROM products x ORDER BY x.name`,
      [null],
    ),
    db.query(
      `SELECT 'accessory' AS type, x.id, x.name, x.is_active, NULL AS image, 'HSN ' || x.hsn_code AS subtitle,
         ${PURCHASED('accessory_id')} AS purchased, ${INVOICED('accessory_id')} AS invoiced, 0 AS ordered,
         ${SUPPLIER_PRODUCTS('accessory_id')} AS supplier_product_count, 0 AS variant_count
       FROM product_accessories x ORDER BY x.name`,
      [null],
    ),
  ]);
  return [...products.rows, ...accessories.rows];
}

async function findItem(type, id) {
  const sql = type === 'product'
    ? `SELECT x.id, x.name, x.is_active,
         (SELECT pi.image FROM product_images pi WHERE pi.product_id = x.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image,
         (SELECT c.name FROM categories c WHERE c.id = x.category_id) AS subtitle
       FROM products x WHERE x.id = $1`
    : `SELECT x.id, x.name, x.is_active, NULL AS image, 'HSN ' || x.hsn_code AS subtitle FROM product_accessories x WHERE x.id = $1`;
  const { rows } = await db.query(sql, [id]);
  return rows[0] || null;
}

// Every movement of one item, oldest first: purchases (+), issued vendor invoice lines (−) and, for products,
// non-cancelled website order lines (−). Each row: { date, kind, ref_id, ref_no, party, detail, quantity, created_at }.
async function movements(type, id) {
  const key = type === 'product' ? 'product_id' : 'accessory_id';
  const parts = [
    `SELECT p.bill_date AS date, 'purchase' AS kind, p.id AS ref_id, 'PUR-' || LPAD(p.id::TEXT, 6, '0') AS ref_no,
       s.name AS party, sp.name || ' · bill ' || p.bill_no AS detail, pi.quantity AS quantity, p.created_at
     FROM purchase_items pi
     JOIN purchases p ON p.id = pi.purchase_id
     JOIN suppliers s ON s.id = p.supplier_id
     JOIN supplier_products sp ON sp.id = pi.supplier_product_id
     WHERE sp.${key} = $1`,
    `SELECT i.invoice_date AS date, 'invoice' AS kind, i.id AS ref_id, i.invoice_no AS ref_no,
       i.bill_name AS party, it.description AS detail, -it.quantity AS quantity, i.created_at
     FROM vendor_invoice_items it
     JOIN vendor_invoices i ON i.id = it.invoice_id
     WHERE it.${key} = $1 AND i.status = 'issued'`,
  ];
  if (type === 'product') {
    parts.push(
      `SELECT (o.created_at AT TIME ZONE 'Asia/Kolkata')::DATE AS date, 'order' AS kind, o.id AS ref_id,
         'ORD-' || LPAD(o.id::TEXT, 6, '0') AS ref_no, o.ship_name AS party,
         oi.product_name || COALESCE(' (' || oi.variant_label || ')', '') AS detail, -oi.quantity AS quantity, o.created_at
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.status <> 'cancelled'`,
    );
  }
  const { rows } = await db.query(`${parts.join(' UNION ALL ')} ORDER BY date, created_at, ref_id`, [id]);
  return rows;
}

module.exports = { productStock, accessoryStock, overview, findItem, movements };
