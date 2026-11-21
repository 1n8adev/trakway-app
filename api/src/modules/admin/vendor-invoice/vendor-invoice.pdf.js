// Draws a vendor GST tax invoice (A4) with pdfkit and resolves with the PDF as a Buffer.
// Page 1: logo header, from / billed to, items, totals, payments, bank details, signature.
// Terms & conditions get their own page after it.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { amountInWords } = require('../../invoice/invoice.pdf');

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets');
// Both images have wide empty margins; the artwork sits in the given box (px) and the rest is cropped.
const LOGO = {
  file: path.join(ASSETS, 'invoice-logo.png'),
  width: 2084, x: 30, y: 280, artWidth: 2025, artHeight: 480,
};
// Authorised signatory's signature, printed above "Authorised Signatory". Drawn whole and scaled to
// fit its box, so any replacement image shows in full (crop tight margins in the image itself).
const SIGNATURE_FILE = path.join(ASSETS, 'signature.jpg');
const SIGNATURE_BOX = { width: 150, height: 56 };
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT = MARGIN + CONTENT_WIDTH;
const BOTTOM = PAGE_HEIGHT - MARGIN - 28; // room for the footer
const BRAND = '#f37021';
const INK = '#0d4a3f'; // logo green
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const LINE = '#d1d5db';
const PAD = 6;

// The standard PDF fonts have no ₹ glyph, so amounts use "Rs.".
const money = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (n) => `Rs. ${money(n)}`;
const qty = (n) => (Number.isInteger(Number(n)) ? String(Number(n)) : money(n));

// "2026-10-30" -> "30 Oct 2026"
function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

const STAMPS = {
  paid: { text: 'PAID', color: '#15803d', bg: '#dcfce7' },
  partial: { text: 'PARTIALLY PAID', color: '#b45309', bg: '#fef3c7' },
  unpaid: { text: 'UNPAID', color: '#b91c1c', bg: '#fee2e2' },
  cancelled: { text: 'CANCELLED', color: '#4b5563', bg: '#e5e7eb' },
};

const COLS = [
  { key: 'no', label: '#', width: 24, align: 'left' },
  { key: 'description', label: 'Description', width: 177, align: 'left' },
  { key: 'hsn', label: 'HSN/SAC', width: 54, align: 'left' },
  { key: 'qty', label: 'Qty', width: 40, align: 'right' },
  { key: 'rate', label: 'Rate', width: 66, align: 'right' },
  { key: 'gst', label: 'GST', width: 38, align: 'right' },
  { key: 'tax', label: 'Tax', width: 56, align: 'right' },
  { key: 'amount', label: 'Amount', width: 60, align: 'right' },
];

// Draws an image's artwork (margins cropped off) with its top-left at (x, y), `width` points wide.
// Returns the drawn height, or 0 when the file is missing.
function drawCropped(doc, img, x, y, width) {
  if (!fs.existsSync(img.file)) return 0;
  const scale = width / img.artWidth;
  const height = img.artHeight * scale;
  doc.save();
  doc.rect(x, y, width, height).clip();
  doc.image(img.file, x - img.x * scale, y - img.y * scale, { width: img.width * scale });
  doc.restore();
  return height;
}

const drawLogo = (doc, x, y, width) => drawCropped(doc, LOGO, x, y, width);

function renderVendorInvoicePdf({ seller, invoice }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0, // positions are absolute
      bufferPages: true, // footer ("Page x of y") is drawn on every page at the end
      info: { Title: `Tax Invoice ${invoice.invoice_no}`, Author: seller.sellerName, Subject: invoice.bill_name },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = MARGIN;
    // Continuation pages get a slim header: logo + invoice number.
    const newPage = () => {
      doc.addPage();
      const h = drawLogo(doc, MARGIN, MARGIN, 120);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        .text(`Invoice ${invoice.invoice_no}`, MARGIN, MARGIN + 8, { width: CONTENT_WIDTH, align: 'right' });
      y = MARGIN + Math.max(h, 20) + 10;
      doc.moveTo(MARGIN, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(0.75).stroke();
      y += 14;
    };
    const ensure = (height) => {
      if (y + height > BOTTOM) newPage();
    };
    function sectionTitle(title, x = MARGIN, width = CONTENT_WIDTH) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND).text(title, x, y, { width, characterSpacing: 0.5 });
      y = doc.y + 4;
    }

    // ---- header: logo (left), title + meta (right), orange rule ----
    const logoHeight = drawLogo(doc, MARGIN, y + 4, 190);
    doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('TAX INVOICE', MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
    let metaY = y + 28;
    const meta = [
      ['Invoice No', invoice.invoice_no],
      ['Invoice Date', formatDate(invoice.invoice_date)],
      ...(invoice.due_date ? [['Due Date', formatDate(invoice.due_date)]] : []),
    ];
    for (const [label, value] of meta) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, RIGHT - 220, metaY, { width: 80 });
      doc.font('Helvetica-Bold').fillColor(TEXT).text(value, RIGHT - 140, metaY, { width: 140, align: 'right' });
      metaY += 14;
    }
    const stamp = STAMPS[invoice.status === 'cancelled' ? 'cancelled' : invoice.payment_status];
    if (stamp) {
      doc.font('Helvetica-Bold').fontSize(8);
      const w = doc.widthOfString(stamp.text) + 14;
      doc.roundedRect(RIGHT - w, metaY + 2, w, 15, 7.5).fill(stamp.bg);
      doc.fillColor(stamp.color).text(stamp.text, RIGHT - w, metaY + 6, { width: w, align: 'center' });
      metaY += 20;
    }
    y = Math.max(y + 4 + logoHeight, metaY) + 10;
    doc.rect(MARGIN, y, CONTENT_WIDTH, 2.5).fill(BRAND);
    y += 16;

    // ---- from / billed to ----
    const colWidth = (CONTENT_WIDTH - 24) / 2;
    const party = (title, x, lines) => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND).text(title, x, y, { width: colWidth, characterSpacing: 0.5 });
      doc.moveDown(0.35);
      lines.forEach((line, i) => {
        doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(i === 0 ? 10.5 : 9).fillColor(i === 0 ? TEXT : MUTED);
        doc.text(line, x, doc.y, { width: colWidth });
      });
      return doc.y;
    };
    const fromEnd = party('FROM', MARGIN, [
      seller.sellerName,
      ...seller.sellerAddress,
      seller.sellerPhone ? `Phone: ${seller.sellerPhone}` : null,
      seller.sellerEmail ? `Email: ${seller.sellerEmail}` : null,
      seller.sellerGstin ? `GSTIN: ${seller.sellerGstin}` : null,
    ].filter(Boolean));
    const billEnd = party('BILLED TO', MARGIN + colWidth + 24, [
      invoice.bill_name,
      invoice.bill_contact_person ? `Attn: ${invoice.bill_contact_person}` : null,
      invoice.bill_address,
      `${invoice.bill_city}, ${invoice.bill_state} - ${invoice.bill_pincode}`,
      `Phone: +91 ${invoice.bill_mobile}`,
      invoice.bill_email ? `Email: ${invoice.bill_email}` : null,
      invoice.bill_gstin ? `GSTIN: ${invoice.bill_gstin}` : null,
    ].filter(Boolean));
    y = Math.max(fromEnd, billEnd) + 8;
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`Place of supply: ${invoice.bill_state}`, MARGIN, y);
    y = doc.y + 12;

    // ---- items ----
    const tableHeader = () => {
      doc.rect(MARGIN, y, CONTENT_WIDTH, 22).fill(INK);
      let x = MARGIN;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
      for (const col of COLS) {
        doc.text(col.label, x + PAD, y + 7, { width: col.width - PAD * 2, align: col.align });
        x += col.width;
      }
      y += 22;
    };
    tableHeader();

    invoice.items.forEach((item, index) => {
      const cells = {
        no: String(index + 1),
        description: item.description,
        hsn: item.hsn_sac || '—',
        qty: qty(item.quantity),
        rate: money(item.unit_price),
        gst: `${Number(item.gst_rate)}%`,
        tax: money(item.tax_amount),
        amount: money(item.taxable_value),
      };
      // Measure each cell in the font it's drawn in (the description is bold, so it wraps sooner).
      const rowHeight = Math.max(...COLS.map((col) => {
        doc.font(col.key === 'description' ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        return doc.heightOfString(cells[col.key], { width: col.width - PAD * 2 });
      })) + PAD * 2;
      if (y + rowHeight > BOTTOM) {
        newPage();
        tableHeader();
      }
      if (index % 2 === 1) doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill('#f9fafb');
      let x = MARGIN;
      for (const col of COLS) {
        doc.font(col.key === 'description' ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(TEXT);
        doc.text(cells[col.key], x + PAD, y + PAD, { width: col.width - PAD * 2, align: col.align });
        x += col.width;
      }
      y += rowHeight;
      doc.moveTo(MARGIN, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(0.5).stroke();
    });

    // ---- totals (right) ----
    const taxRows = invoice.intra_state
      ? invoice.tax_summary.flatMap((g) => [[`CGST @ ${g.rate / 2}%`, g.cgst], [`SGST @ ${g.rate / 2}%`, g.sgst]])
      : invoice.tax_summary.map((g) => [`IGST @ ${g.rate}%`, g.igst]);
    // The grand total is already rounded to the rupee; the round-off line is intentionally not printed.
    const totalRows = [['Subtotal (taxable value)', invoice.subtotal], ...taxRows.filter(([, amount]) => amount > 0)];
    ensure(totalRows.length * 15 + 80);
    y += 10;
    const totalsX = RIGHT - 240;
    const row = (label, value, { bold = false, color = TEXT, size = 9 } = {}) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(bold ? TEXT : MUTED);
      doc.text(label, totalsX, y, { width: 140 });
      doc.fillColor(color).text(value, totalsX + 140, y, { width: 100, align: 'right' });
      y += size + 6;
    };
    for (const [label, value] of totalRows) row(label, inr(value));
    y += 2;
    doc.rect(totalsX - 8, y - 4, 248, 22).fill('#fff4ec');
    row('Grand Total', inr(invoice.grand_total), { bold: true, size: 11, color: BRAND });
    y += 2;
    if (invoice.status !== 'cancelled') {
      row('Paid', inr(invoice.amount_paid), { color: '#15803d' });
      row('Balance Due', inr(invoice.balance), { bold: true });
    }

    // ---- amount in words ----
    y += 6;
    ensure(30);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text('Amount in words: ', MARGIN, y, { continued: true })
      .font('Helvetica').text(amountInWords(invoice.grand_total), { width: CONTENT_WIDTH });
    y = doc.y + 14;

    // ---- payment details ----
    if (invoice.payments.length) {
      ensure(40 + invoice.payments.length * 18);
      sectionTitle('PAYMENT DETAILS');
      const pCols = [['Date', 110, 'left'], ['Method', 120, 'left'], ['Reference', 175, 'left'], ['Amount', 110, 'right']];
      const pRow = (cells, header = false) => {
        if (header) doc.rect(MARGIN, y, CONTENT_WIDTH, 18).fill('#f3f4f6');
        let x = MARGIN;
        cells.forEach((cell, i) => {
          const [, width, align] = pCols[i];
          doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(header ? TEXT : MUTED);
          doc.text(cell, x + PAD, y + 5, { width: width - PAD * 2, align });
          x += width;
        });
        y += 18;
      };
      pRow(pCols.map(([label]) => label), true);
      for (const p of invoice.payments) {
        ensure(18);
        pRow([formatDate(p.paid_on), p.method_label, p.reference || '—', inr(p.amount)]);
      }
      y += 12;
    }

    // ---- bank details + notes (left), signature (right) ----
    const leftWidth = CONTENT_WIDTH - 200;
    const bank = seller.bank;
    const bankRows = [
      ['Bank Name', bank.bankName],
      ['Account Name', bank.accountName],
      ['Account No', bank.accountNo],
      ['IFSC Code', bank.ifsc],
      ['Branch', bank.branch],
      ['Account Type', bank.accountType],
    ].filter(([, value]) => value);
    const BANK_ROW = 14;
    const bankHeight = bankRows.length ? bankRows.length * BANK_ROW + 38 : 0;
    doc.font('Helvetica').fontSize(8.5);
    const notesHeight = invoice.notes ? doc.heightOfString(invoice.notes, { width: leftWidth }) + 24 : 0;
    ensure(Math.max(bankHeight + notesHeight, 70));
    const blockTop = y;

    if (bankRows.length) {
      doc.roundedRect(MARGIN, y, leftWidth, bankHeight - 8, 4).fillAndStroke('#f9fafb', LINE);
      y += 10;
      sectionTitle('BANK DETAILS', MARGIN + 10, leftWidth - 20);
      for (const [label, value] of bankRows) {
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(label, MARGIN + 10, y, { width: 80 });
        doc.font('Helvetica-Bold').fillColor(TEXT).text(value, MARGIN + 95, y, { width: leftWidth - 105 });
        y += BANK_ROW;
      }
      y = blockTop + bankHeight + 4;
    }
    if (invoice.notes) {
      sectionTitle('NOTES', MARGIN, leftWidth);
      doc.font('Helvetica').fontSize(8.5).fillColor(TEXT).text(invoice.notes, MARGIN, y, { width: leftWidth, lineGap: 1.5 });
      y = doc.y + 10;
    }

    const signY = blockTop + 4;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT)
      .text(`For ${seller.sellerName}`, RIGHT - 180, signY, { width: 180, align: 'right' });
    // Whole signature, scaled to fit the box above the signatory line (centred, bottom-aligned to the line).
    const boxTop = signY + 16;
    if (fs.existsSync(SIGNATURE_FILE)) {
      doc.image(SIGNATURE_FILE, RIGHT - SIGNATURE_BOX.width, boxTop, {
        fit: [SIGNATURE_BOX.width, SIGNATURE_BOX.height],
        align: 'center',
        valign: 'bottom',
      });
    }
    const lineY = boxTop + SIGNATURE_BOX.height + 4;
    doc.moveTo(RIGHT - SIGNATURE_BOX.width, lineY).lineTo(RIGHT, lineY).strokeColor(LINE).lineWidth(0.75).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('Authorised Signatory', RIGHT - 180, lineY + 4, { width: 180, align: 'right' });
    y = Math.max(y, lineY + 20);

    // ---- terms & conditions on their own page ----
    if (invoice.terms) {
      newPage();
      doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text('Terms & Conditions', MARGIN, y);
      y = doc.y + 10;
      const lines = invoice.terms.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.forEach((line, i) => {
        doc.font('Helvetica').fontSize(9.5);
        const text = /^\d+[.)]\s/.test(line) ? line : `${i + 1}. ${line}`;
        ensure(doc.heightOfString(text, { width: CONTENT_WIDTH }) + 6);
        doc.fillColor(TEXT).text(text, MARGIN, y, { width: CONTENT_WIDTH, lineGap: 2 });
        y = doc.y + 6;
      });
    }

    // ---- footer on every page: company contact + page number (the address is in the FROM block) ----
    const contact = [seller.sellerName, seller.sellerPhone, seller.sellerEmail].filter(Boolean).join('  |  ');
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = PAGE_HEIGHT - MARGIN - 14;
      doc.moveTo(MARGIN, footerY - 8).lineTo(RIGHT, footerY - 8).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
        .text(contact, MARGIN, footerY, { width: CONTENT_WIDTH - 70, lineBreak: false, ellipsis: true });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, RIGHT - 70, footerY, { width: 70, align: 'right', lineBreak: false });
      doc.rect(0, PAGE_HEIGHT - 6, PAGE_WIDTH, 6).fill(BRAND);
    }

    doc.end();
  });
}

module.exports = { renderVendorInvoicePdf };
