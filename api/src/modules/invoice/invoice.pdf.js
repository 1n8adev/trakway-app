// Draws an A4 GST tax invoice with pdfkit and resolves with the PDF as a Buffer.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const LOGO = path.join(__dirname, '..', '..', 'assets', 'invoice-logo.png');
const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 in points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = 841.89 - MARGIN - 30; // room for the footer
const BRAND = '#e75f00';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const LINE = '#d1d5db';

// The standard PDF fonts have no ₹ glyph, so amounts use "Rs.".
const inr = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );

// ---- amount in words (Indian numbering: thousand, lakh, crore) ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ');
}

function wholeToWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${wholeToWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
}

// 2799.5 -> "Rupees Two Thousand Seven Hundred Ninety Nine and Fifty Paise Only"
function amountInWords(amount) {
  const paise = Math.round(Number(amount) * 100);
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return `Rupees ${wholeToWords(rupees)}${rest ? ` and ${belowHundred(rest)} Paise` : ''} Only`;
}

// Address lines for a party (bill_* or ship_* columns).
function addressLines(order, prefix) {
  const get = (key) => order[`${prefix}_${key}`];
  return [
    get('address_line1'),
    get('address_line2'),
    get('landmark') ? `Landmark: ${get('landmark')}` : null,
    [get('city'), get('state')].filter(Boolean).join(', ') + (get('pincode') ? ` - ${get('pincode')}` : ''),
  ].filter(Boolean);
}

function renderInvoicePdf({ seller, order, items, tax }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true, // lets the footer ("Page x of y") be drawn on every page at the end
      info: { Title: `Tax Invoice ${order.invoice_no}`, Author: seller.sellerName, Subject: `Order ${order.order_no}` },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const right = MARGIN + CONTENT_WIDTH;
    let y = MARGIN;

    // ---- header: logo + seller (left), title + invoice meta (right) ----
    if (fs.existsSync(LOGO)) doc.image(LOGO, MARGIN, y, { fit: [130, 55] });
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(20).text('TAX INVOICE', MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });

    const meta = [
      ['Invoice No', order.invoice_no],
      ['Invoice Date', formatDate(order.invoice_date)],
      ['Order No', order.order_no],
      ['Order Date', formatDate(order.created_at)],
    ];
    let metaY = y + 28;
    for (const [label, value] of meta) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, right - 210, metaY, { width: 80 });
      doc.font('Helvetica-Bold').fillColor(TEXT).text(value, right - 130, metaY, { width: 130, align: 'right' });
      metaY += 13;
    }

    y += 62;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT).text(seller.sellerName, MARGIN, y, { width: 300 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    for (const line of [
      ...seller.sellerAddress,
      `State: ${seller.sellerState}`,
      `GSTIN: ${seller.sellerGstin}`,
      [seller.sellerPhone, seller.sellerEmail].filter(Boolean).join('  |  '),
    ]) {
      doc.text(line, MARGIN, doc.y, { width: 300 });
    }
    y = Math.max(doc.y, metaY) + 12;

    doc.moveTo(MARGIN, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 12;

    // ---- bill to / ship to ----
    const colWidth = (CONTENT_WIDTH - 20) / 2;
    const party = (title, x, lines) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text(title, x, y, { width: colWidth });
      doc.moveDown(0.3);
      lines.forEach((line, i) => {
        doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(i === 0 ? TEXT : MUTED);
        doc.text(line, x, doc.y, { width: colWidth });
      });
      return doc.y;
    };

    const billName = order.bill_name || order.ship_name;
    const billLines = [
      order.bill_company_name || billName,
      order.bill_company_name ? billName : null,
      ...addressLines(order, order.bill_address_line1 ? 'bill' : 'ship'),
      `Phone: ${order.bill_phone || order.ship_phone}`,
      order.customer_email ? `Email: ${order.customer_email}` : null,
      order.bill_gstin ? `GSTIN: ${order.bill_gstin}` : null,
    ].filter(Boolean);
    const shipLines = [order.ship_name, ...addressLines(order, 'ship'), `Phone: ${order.ship_phone}`];

    const billEnd = party('BILL TO', MARGIN, billLines);
    const shipEnd = party('SHIP TO', MARGIN + colWidth + 20, shipLines);
    y = Math.max(billEnd, shipEnd) + 6;
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Place of supply: ${order.bill_state || order.ship_state}`, MARGIN, y, { width: CONTENT_WIDTH });
    y = doc.y + 14;

    // ---- items table ----
    const cols = [
      { key: 'no', label: '#', width: 24, align: 'left' },
      { key: 'item', label: 'Item', width: 231, align: 'left' },
      { key: 'hsn', label: 'HSN', width: 50, align: 'left' },
      { key: 'qty', label: 'Qty', width: 40, align: 'right' },
      { key: 'rate', label: 'Rate', width: 80, align: 'right' },
      { key: 'amount', label: 'Amount', width: 90, align: 'right' },
    ];
    const PAD = 6;

    const tableHeader = () => {
      doc.rect(MARGIN, y, CONTENT_WIDTH, 22).fill('#fff4ec');
      let x = MARGIN;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT);
      for (const col of cols) {
        doc.text(col.label, x + PAD, y + 7, { width: col.width - PAD * 2, align: col.align });
        x += col.width;
      }
      y += 22;
    };
    tableHeader();

    items.forEach((item, index) => {
      const description = [item.product_name, item.variant_label, item.sku ? `SKU: ${item.sku}` : null].filter(Boolean);
      const cells = {
        no: String(index + 1),
        item: description.join('\n'),
        hsn: seller.hsn,
        qty: String(item.quantity),
        rate: inr(item.final_price),
        amount: inr(item.line_total),
      };
      doc.font('Helvetica').fontSize(9);
      const rowHeight = Math.max(...cols.map((col) => doc.heightOfString(cells[col.key], { width: col.width - PAD * 2 }))) + PAD * 2;
      if (y + rowHeight > PAGE_BOTTOM) {
        doc.addPage();
        y = MARGIN;
        tableHeader();
      }
      let x = MARGIN;
      for (const col of cols) {
        doc.font(col.key === 'item' ? 'Helvetica-Bold' : 'Helvetica').fillColor(TEXT);
        if (col.key === 'item') {
          // Product name bold, variant / SKU muted underneath.
          doc.text(description[0], x + PAD, y + PAD, { width: col.width - PAD * 2 });
          if (description.length > 1) {
            doc.font('Helvetica').fillColor(MUTED).text(description.slice(1).join('\n'), x + PAD, doc.y, { width: col.width - PAD * 2 });
          }
        } else {
          doc.text(cells[col.key], x + PAD, y + PAD, { width: col.width - PAD * 2, align: col.align });
        }
        x += col.width;
      }
      y += rowHeight;
      doc.moveTo(MARGIN, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.5).stroke();
    });

    // ---- totals (right) + tax summary (left) ----
    const SUMMARY_HEIGHT = 170;
    if (y + SUMMARY_HEIGHT > PAGE_BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
    y += 12;
    const totalsX = right - 220;
    const totalsRow = (label, value, { bold = false, color = TEXT } = {}) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9).fillColor(bold ? TEXT : MUTED);
      doc.text(label, totalsX, y, { width: 120 });
      doc.fillColor(color).text(value, totalsX + 120, y, { width: 100, align: 'right' });
      y += bold ? 18 : 15;
    };
    const summaryTop = y;
    totalsRow('Subtotal', inr(order.subtotal));
    if (Number(order.coupon_discount) > 0) {
      totalsRow(`Coupon${order.coupon_code ? ` (${order.coupon_code})` : ''}`, `- ${inr(order.coupon_discount)}`, { color: '#15803d' });
    }
    totalsRow('Shipping', Number(order.shipping_fee) > 0 ? inr(order.shipping_fee) : 'Free');
    doc.moveTo(totalsX, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 6;
    totalsRow('Grand Total', inr(order.total), { bold: true });
    const totalsEnd = y;

    // Tax summary box (GST included in the prices above).
    y = summaryTop;
    const boxWidth = 250;
    const taxRows = [
      ['Taxable value', inr(tax.taxable)],
      ...(tax.intraState
        ? [[`CGST @ ${tax.rate / 2}%`, inr(tax.cgst)], [`SGST @ ${tax.rate / 2}%`, inr(tax.sgst)]]
        : [[`IGST @ ${tax.rate}%`, inr(tax.igst)]]),
      ['Total GST (included)', inr(tax.gst)],
    ];
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text('GST SUMMARY', MARGIN, y);
    y = doc.y + 4;
    for (const [label, value] of taxRows) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, MARGIN, y, { width: 140 });
      doc.fillColor(TEXT).text(value, MARGIN + 140, y, { width: boxWidth - 140, align: 'right' });
      y += 14;
    }

    y = Math.max(y, totalsEnd) + 14;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text('Amount in words: ', MARGIN, y, { continued: true })
      .font('Helvetica').text(amountInWords(order.total), { width: CONTENT_WIDTH });
    y = doc.y + 6;
    const payment = order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method;
    doc.font('Helvetica-Bold').text('Payment: ', MARGIN, y, { continued: true })
      .font('Helvetica').text(`${payment} (${order.payment_status === 'paid' ? 'Paid' : 'Payment pending'})`);

    // ---- footer on every page ----
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = 841.89 - MARGIN - 18;
      doc.moveTo(MARGIN, footerY - 6).lineTo(right, footerY - 6).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
        'Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.',
        MARGIN,
        footerY,
        { width: CONTENT_WIDTH - 60, lineBreak: false },
      );
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, right - 60, footerY, { width: 60, align: 'right', lineBreak: false });
    }

    doc.end();
  });
}

module.exports = { renderInvoicePdf, amountInWords };
