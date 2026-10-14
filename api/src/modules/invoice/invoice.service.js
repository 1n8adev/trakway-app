// Business logic for tax invoices, shared by the admin and customer download routes.
// Callers check access first (admin: any order; customer: own orders), then call getInvoicePdf().
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { round2 } = require('../../utils/money');
const invoiceRepository = require('./invoice.repository');
const { renderInvoicePdf } = require('./invoice.pdf');

// Indian financial year (April–March) of a date, in IST: 2026-10-14 -> "2026-27".
function financialYear(date = new Date()) {
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' })
    .format(date)
    .split('-')
    .map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// "TW/2026-27/0001"
const invoiceNumber = (fy, seq) => `${env.invoice.prefix}/${fy}/${String(seq).padStart(4, '0')}`;

const sameState = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Prices are GST-inclusive: the GST inside the grand total, split CGST+SGST (same state) or IGST.
function taxBreakup(total, buyerState) {
  const rate = env.invoice.gstRate;
  const taxable = round2(total / (1 + rate / 100));
  const gst = round2(total - taxable);
  if (sameState(buyerState, env.invoice.sellerState)) {
    const cgst = round2(gst / 2);
    return { rate, taxable, gst, intraState: true, cgst, sgst: round2(gst - cgst), igst: 0 };
  }
  return { rate, taxable, gst, intraState: false, cgst: 0, sgst: 0, igst: gst };
}

// Returns { filename, invoiceNo, pdf (Buffer) }. Assigns the invoice number on first generation.
async function getInvoicePdf(orderId) {
  let order = await invoiceRepository.findOrder(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'cancelled') throw ApiError.conflict('Invoices are not available for cancelled orders');

  if (!order.invoice_no) {
    await invoiceRepository.assignInvoiceNumber(order.id, financialYear(), invoiceNumber);
    order = await invoiceRepository.findOrder(orderId);
  }

  const items = await invoiceRepository.findItems(order.id);
  const buyerState = order.bill_state || order.ship_state;
  const pdf = await renderInvoicePdf({
    seller: env.invoice,
    order,
    items,
    tax: taxBreakup(Number(order.total), buyerState),
  });

  return { filename: `Invoice-${order.invoice_no.replace(/\//g, '-')}.pdf`, invoiceNo: order.invoice_no, pdf };
}

// Sends the PDF as a download.
function sendPdf(res, { filename, pdf }) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': pdf.length,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
}

module.exports = { getInvoicePdf, sendPdf, financialYear, taxBreakup };
