// SQL queries for tax invoices. Only this layer talks to the database.
const db = require('../../config/db');

const ORDER_COLUMNS = `o.id, 'ORD-' || LPAD(o.id::TEXT, 6, '0') AS order_no, o.user_id, o.status,
  o.payment_method, o.payment_status, o.subtotal, o.mrp_total, o.coupon_code, o.coupon_discount,
  o.shipping_fee, o.total, o.invoice_no, o.invoice_date, o.created_at,
  o.ship_name, o.ship_phone, o.ship_address_line1, o.ship_address_line2, o.ship_landmark,
  o.ship_city, o.ship_state, o.ship_pincode,
  o.bill_name, o.bill_phone, o.bill_address_line1, o.bill_address_line2, o.bill_landmark,
  o.bill_city, o.bill_state, o.bill_pincode, o.bill_company_name, o.bill_gstin,
  u.email AS customer_email`;

async function findOrder(id) {
  const { rows } = await db.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function findItems(orderId) {
  const { rows } = await db.query(
    `SELECT product_name, variant_label, sku, final_price, quantity, line_total
     FROM order_items WHERE order_id = $1 ORDER BY id`,
    [orderId],
  );
  return rows;
}

// Gives the order its invoice number (once). numberFor(financialYear, seq) builds the number text.
// The order row lock + per-year counter keep numbers consecutive and unique under concurrent downloads.
async function assignInvoiceNumber(orderId, financialYear, numberFor) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT invoice_no FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (!rows.length || rows[0].invoice_no) return;

    const seq = await client.query(
      `INSERT INTO invoice_sequences (financial_year, last_number) VALUES ($1, 1)
       ON CONFLICT (financial_year) DO UPDATE SET last_number = invoice_sequences.last_number + 1
       RETURNING last_number`,
      [financialYear],
    );
    await client.query('UPDATE orders SET invoice_no = $2, invoice_date = NOW() WHERE id = $1', [
      orderId,
      numberFor(financialYear, seq.rows[0].last_number),
    ]);
  });
}

module.exports = { findOrder, findItems, assignInvoiceNumber };
