// SQL queries for purchases. Only this layer talks to the database.
const db = require('../../../config/db');

const PURCHASE_NO = "'PUR-' || LPAD(p.id::TEXT, 6, '0')";
// Sum of the payments Trakway has sent against the bill.
const PAID = '(SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.purchase_id = p.id)';
const COLUMNS = `p.id, ${PURCHASE_NO} AS purchase_no, p.supplier_id, s.name AS supplier_name, s.gstin AS supplier_gstin,
  s.state AS supplier_state, p.bill_no, p.bill_date, p.bill_file, p.bill_file_name, p.intra_state, p.subtotal, p.cgst,
  p.sgst, p.igst, p.total_tax, p.round_off, p.grand_total, p.notes, p.created_by, a.name AS created_by_name,
  p.created_at, p.updated_at, ${PAID} AS amount_paid`;
const FROM = `purchases p JOIN suppliers s ON s.id = p.supplier_id LEFT JOIN admin_users a ON a.id = p.created_by`;

// Filters: search (PUR-000012, bill no, supplier name / GSTIN), supplierId, from / to (bill date),
// paymentStatus (unpaid | partial | paid).
function whereClause({ search, supplierId, from, to, paymentStatus }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(${PURCHASE_NO} ILIKE ${p} OR p.bill_no ILIKE ${p} OR s.name ILIKE ${p} OR s.gstin ILIKE ${p})`);
  }
  if (supplierId) {
    params.push(supplierId);
    conditions.push(`p.supplier_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`p.bill_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`p.bill_date <= $${params.length}`);
  }
  if (paymentStatus === 'unpaid') conditions.push(`${PAID} = 0`);
  if (paymentStatus === 'partial') conditions.push(`${PAID} > 0 AND ${PAID} < p.grand_total`);
  if (paymentStatus === 'paid') conditions.push(`${PAID} > 0 AND ${PAID} >= p.grand_total`);
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

// Rows add item_count and total_quantity.
async function findAll(filters, { limit, offset }) {
  const { where, params } = whereClause(filters);
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS}, COALESCE(i.item_count, 0)::INT AS item_count, COALESCE(i.total_quantity, 0) AS total_quantity
       FROM ${FROM}
       LEFT JOIN (SELECT purchase_id, COUNT(*) AS item_count, SUM(quantity) AS total_quantity FROM purchase_items GROUP BY purchase_id) i
         ON i.purchase_id = p.id
       ${where}
       ORDER BY p.bill_date DESC, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::INT AS total, COALESCE(SUM(p.grand_total), 0) AS total_amount, COALESCE(SUM(${PAID}), 0) AS total_paid
       FROM ${FROM} ${where}`,
      params,
    ),
  ]);
  const { total, total_amount: totalAmount, total_paid: totalPaid } = count.rows[0];
  return { items: list.rows, total, totalAmount, totalPaid };
}

async function findById(id, client = db) {
  const { rows } = await client.query(`SELECT ${COLUMNS} FROM ${FROM} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function findItems(purchaseId) {
  const { rows } = await db.query(
    `SELECT id, supplier_product_id, name, hsn_code, quantity, unit_price, gst_rate, taxable_value, tax_amount, line_total
     FROM purchase_items WHERE purchase_id = $1 ORDER BY sort_order, id`,
    [purchaseId],
  );
  return rows;
}

async function findSupplier(id) {
  const { rows } = await db.query('SELECT id, name, state, gstin, is_active FROM suppliers WHERE id = $1', [id]);
  return rows[0] || null;
}

// Supplier products by id (any status), to price and check the lines.
async function findSupplierProducts(ids) {
  if (!ids.length) return [];
  const { rows } = await db.query(
    'SELECT id, supplier_id, name, price, hsn_code, gst_rate, is_active FROM supplier_products WHERE id = ANY($1::BIGINT[])',
    [ids],
  );
  return rows;
}

async function billExists(supplierId, billNo, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM purchases WHERE supplier_id = $1 AND UPPER(bill_no) = UPPER($2) AND ($3::BIGINT IS NULL OR id <> $3) LIMIT 1',
    [supplierId, billNo, excludeId],
  );
  return rows.length > 0;
}

// Active suppliers and their active products for the purchase form.
async function options() {
  const [suppliers, products] = await Promise.all([
    db.query('SELECT id, name, gstin, state FROM suppliers WHERE is_active ORDER BY name'),
    db.query(
      `SELECT sp.id, sp.supplier_id, sp.name, sp.price, sp.hsn_code, sp.gst_rate
       FROM supplier_products sp JOIN suppliers s ON s.id = sp.supplier_id
       WHERE sp.is_active AND s.is_active ORDER BY sp.name`,
    ),
  ]);
  return { suppliers: suppliers.rows, products: products.rows };
}

const PURCHASE_WRITABLE = ['bill_no', 'bill_date', 'intra_state', 'subtotal', 'cgst', 'sgst', 'igst', 'total_tax',
  'round_off', 'grand_total', 'notes'];
const ITEM_WRITABLE = ['supplier_product_id', 'name', 'hsn_code', 'quantity', 'unit_price', 'gst_rate', 'taxable_value',
  'tax_amount', 'line_total', 'sort_order'];

async function insertItems(client, purchaseId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO purchase_items (purchase_id, ${ITEM_WRITABLE.join(', ')})
       VALUES ($1, ${ITEM_WRITABLE.map((_, i) => `$${i + 2}`).join(', ')})`,
      [purchaseId, ...ITEM_WRITABLE.map((key) => item[key])],
    );
  }
}

async function create(purchase, items) {
  return db.withTransaction(async (client) => {
    const keys = [...PURCHASE_WRITABLE, 'supplier_id', 'bill_file', 'bill_file_name', 'created_by'];
    const { rows } = await client.query(
      `INSERT INTO purchases (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      keys.map((key) => purchase[key] ?? null),
    );
    await insertItems(client, rows[0].id, items);
    return rows[0].id;
  });
}

// Replaces the purchase's header values and all of its lines. billFile: undefined = keep the
// stored file, null = clear it, { key, name } = replace it.
// checkPaid(paid) runs with the purchase row locked, before anything changes (throws to stop the update).
async function update(id, purchase, items, billFile, checkPaid = () => {}) {
  await db.withTransaction(async (client) => {
    await client.query('SELECT id FROM purchases WHERE id = $1 FOR UPDATE', [id]);
    const { rows: paidRows } = await client.query('SELECT COALESCE(SUM(amount), 0) AS paid FROM purchase_payments WHERE purchase_id = $1', [id]);
    checkPaid(paidRows[0].paid);
    const keys = [...PURCHASE_WRITABLE];
    const values = keys.map((key) => purchase[key] ?? null);
    if (billFile !== undefined) {
      keys.push('bill_file', 'bill_file_name');
      values.push(billFile?.key ?? null, billFile?.name ?? null);
    }
    await client.query(
      `UPDATE purchases SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      [...values, id],
    );
    await client.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);
    await insertItems(client, id, items);
  });
}

async function paymentCount(id) {
  const { rows } = await db.query('SELECT COUNT(*)::INT AS n FROM purchase_payments WHERE purchase_id = $1', [id]);
  return rows[0].n;
}

async function remove(id) {
  await db.query('DELETE FROM purchases WHERE id = $1', [id]);
}

module.exports = { findAll, findById, findItems, findSupplier, findSupplierProducts, billExists, options, create, update, paymentCount, remove };
