// SQL queries for vendor invoices. Only this layer talks to the database.
const db = require('../../../config/db');
const { finalPriceSql } = require('../../../utils/pricing');

const PAYMENT_STATUS_SQL = `CASE WHEN i.amount_paid >= i.grand_total THEN 'paid'
  WHEN i.amount_paid > 0 THEN 'partial' ELSE 'unpaid' END`;

const INVOICE_COLUMNS = `i.id, i.invoice_no, i.vendor_id, i.invoice_date, i.due_date,
  i.bill_name, i.bill_contact_person, i.bill_mobile, i.bill_email, i.bill_gstin, i.bill_address,
  i.bill_city, i.bill_state, i.bill_pincode, i.intra_state,
  i.subtotal, i.cgst, i.sgst, i.igst, i.total_tax, i.round_off, i.grand_total, i.amount_paid,
  GREATEST(i.grand_total - i.amount_paid, 0) AS balance,
  ${PAYMENT_STATUS_SQL} AS payment_status,
  i.status, i.notes, i.terms, i.cancelled_at, i.created_at, i.updated_at,
  a.name AS created_by_name`;

const FROM = 'FROM vendor_invoices i LEFT JOIN admin_users a ON a.id = i.created_by';

// Filters: search (invoice no, vendor name, GSTIN, mobile), vendorId, status, paymentStatus, from/to (invoice_date).
function whereClause({ search, vendorId, status, paymentStatus, from, to }) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(i.invoice_no ILIKE ${p} OR i.bill_name ILIKE ${p} OR i.bill_gstin ILIKE ${p} OR i.bill_mobile ILIKE ${p})`);
  }
  if (vendorId) add('i.vendor_id = ?', vendorId);
  if (status) add('i.status = ?', status);
  if (paymentStatus) add(`(${PAYMENT_STATUS_SQL}) = ?`, paymentStatus);
  if (from) add('i.invoice_date >= ?', from);
  if (to) add('i.invoice_date <= ?', to);
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findAll(filters, { limit, offset }) {
  const { where, params } = whereClause(filters);
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${INVOICE_COLUMNS},
         (SELECT COUNT(*) FROM vendor_invoice_items it WHERE it.invoice_id = i.id)::INT AS item_count
       ${FROM} ${where}
       ORDER BY i.invoice_date DESC, i.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*) AS total ${FROM} ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

// Totals of issued invoices matching the same filters (cancelled ones never count).
async function summary(filters) {
  const { where, params } = whereClause({ ...filters, status: 'issued' });
  const { rows } = await db.query(
    `SELECT COUNT(*)::INT AS count, COALESCE(SUM(i.grand_total), 0) AS billed,
       COALESCE(SUM(i.amount_paid), 0) AS received,
       COALESCE(SUM(GREATEST(i.grand_total - i.amount_paid, 0)), 0) AS outstanding,
       COUNT(*) FILTER (WHERE i.amount_paid < i.grand_total AND i.due_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE)::INT AS overdue
     ${FROM} ${where}`,
    params,
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${INVOICE_COLUMNS} ${FROM} WHERE i.id = $1`, [id]);
  return rows[0] || null;
}

async function findItems(invoiceId) {
  const { rows } = await db.query(
    `SELECT id, product_id, description, hsn_sac, quantity, unit_price, gst_rate, taxable_value, tax_amount, line_total
     FROM vendor_invoice_items WHERE invoice_id = $1 ORDER BY sort_order, id`,
    [invoiceId],
  );
  return rows;
}

async function findPayments(invoiceId) {
  const { rows } = await db.query(
    `SELECT id, paid_on, amount, method, reference, created_at
     FROM vendor_invoice_payments WHERE invoice_id = $1 ORDER BY paid_on, id`,
    [invoiceId],
  );
  return rows;
}

// Active vendors and active products for the invoice form's pickers.
async function options() {
  const [vendors, products] = await Promise.all([
    db.query(
      `SELECT id, name, contact_person, mobile, gstin, city, state
       FROM vendors WHERE is_active = TRUE ORDER BY name`,
    ),
    db.query(
      `SELECT p.id, p.name, ${finalPriceSql('p')} AS price
       FROM products p WHERE p.is_active = TRUE ORDER BY p.name`,
    ),
  ]);
  return { vendors: vendors.rows, products: products.rows };
}

async function findVendor(id) {
  const { rows } = await db.query(
    `SELECT id, name, contact_person, mobile, email, gstin, address, city, state, pincode, is_active
     FROM vendors WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

// { id: name } for the given product ids that exist.
async function productNames(ids) {
  if (!ids.length) return {};
  const { rows } = await db.query('SELECT id, name FROM products WHERE id = ANY($1::BIGINT[])', [ids]);
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

const INVOICE_WRITABLE = ['vendor_id', 'invoice_date', 'due_date', 'bill_name', 'bill_contact_person', 'bill_mobile',
  'bill_email', 'bill_gstin', 'bill_address', 'bill_city', 'bill_state', 'bill_pincode', 'intra_state',
  'subtotal', 'cgst', 'sgst', 'igst', 'total_tax', 'round_off', 'grand_total', 'notes', 'terms'];
const ITEM_WRITABLE = ['product_id', 'description', 'hsn_sac', 'quantity', 'unit_price', 'gst_rate',
  'taxable_value', 'tax_amount', 'line_total', 'sort_order'];

async function insertItems(client, invoiceId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO vendor_invoice_items (invoice_id, ${ITEM_WRITABLE.join(', ')})
       VALUES ($1, ${ITEM_WRITABLE.map((_, i) => `$${i + 2}`).join(', ')})`,
      [invoiceId, ...ITEM_WRITABLE.map((key) => item[key])],
    );
  }
}

// Creates the invoice with the next number of its financial year. numberFor(financialYear, seq) builds the text.
async function create(invoice, items, { financialYear, numberFor, createdBy }) {
  return db.withTransaction(async (client) => {
    const seq = await client.query(
      `INSERT INTO vendor_invoice_sequences (financial_year, last_number) VALUES ($1, 1)
       ON CONFLICT (financial_year) DO UPDATE SET last_number = vendor_invoice_sequences.last_number + 1
       RETURNING last_number`,
      [financialYear],
    );
    const columns = ['invoice_no', ...INVOICE_WRITABLE, 'created_by'];
    const values = [numberFor(financialYear, seq.rows[0].last_number), ...INVOICE_WRITABLE.map((k) => invoice[k]), createdBy];
    const { rows } = await client.query(
      `INSERT INTO vendor_invoices (${columns.join(', ')})
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      values,
    );
    await insertItems(client, rows[0].id, items);
    return rows[0].id;
  });
}

// Replaces the invoice fields and all its items. check(lockedRow) runs on the locked row first and may throw.
async function update(id, invoice, items, check) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT status, amount_paid FROM vendor_invoices WHERE id = $1 FOR UPDATE', [id]);
    check(rows[0]);
    const sets = INVOICE_WRITABLE.map((key, i) => `${key} = $${i + 1}`);
    await client.query(
      `UPDATE vendor_invoices SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${INVOICE_WRITABLE.length + 1}`,
      [...INVOICE_WRITABLE.map((key) => invoice[key]), id],
    );
    await client.query('DELETE FROM vendor_invoice_items WHERE invoice_id = $1', [id]);
    await insertItems(client, id, items);
  });
}

async function cancel(id) {
  await db.query(
    `UPDATE vendor_invoices SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

// Payment changes run on the locked invoice row and keep amount_paid = sum of its payments.
// check(lockedRow) may throw before anything is written.
async function changePayments(invoiceId, check, write) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT status, grand_total, amount_paid FROM vendor_invoices WHERE id = $1 FOR UPDATE',
      [invoiceId],
    );
    check(rows[0]);
    await write(client);
    await client.query(
      `UPDATE vendor_invoices SET updated_at = NOW(), amount_paid =
         (SELECT COALESCE(SUM(amount), 0) FROM vendor_invoice_payments WHERE invoice_id = $1)
       WHERE id = $1`,
      [invoiceId],
    );
  });
}

async function addPayment(invoiceId, payment, check) {
  return changePayments(invoiceId, check, (client) => client.query(
    `INSERT INTO vendor_invoice_payments (invoice_id, paid_on, amount, method, reference) VALUES ($1, $2, $3, $4, $5)`,
    [invoiceId, payment.paid_on, payment.amount, payment.method, payment.reference ?? null],
  ));
}

// Resolves with false when the payment doesn't belong to the invoice.
async function removePayment(invoiceId, paymentId, check) {
  let found = false;
  await changePayments(invoiceId, check, async (client) => {
    const res = await client.query('DELETE FROM vendor_invoice_payments WHERE id = $1 AND invoice_id = $2', [paymentId, invoiceId]);
    found = res.rowCount > 0;
  });
  return found;
}

module.exports = {
  findAll,
  summary,
  findById,
  findItems,
  findPayments,
  options,
  findVendor,
  productNames,
  create,
  update,
  cancel,
  addPayment,
  removePayment,
};
