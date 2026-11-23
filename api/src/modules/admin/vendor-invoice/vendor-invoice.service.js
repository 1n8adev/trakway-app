// Business logic for vendor invoices: GST maths, numbering, payments. Throws ApiError on rule violations.
const env = require('../../../config/env');
const ApiError = require('../../../utils/ApiError');
const { round2 } = require('../../../utils/money');
const vendorInvoiceRepository = require('./vendor-invoice.repository');
const { renderVendorInvoicePdf } = require('./vendor-invoice.pdf');
const settingService = require('../setting/setting.service');
const stockRepository = require('../stock/stock.repository');
const { GST_RATES, PAYMENT_METHODS } = require('./vendor-invoice.validation');

const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

// Indian financial year (April–March) of a "YYYY-MM-DD" date: "2026-10-30" -> "2026-27".
function financialYear(date) {
  const [year, month] = date.split('-').map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// "<type prefix>/<FY>/<seq>", e.g. "TWV/2026-27/0001" (Sales Invoice), "TWR/2026-27/0001" (Renewal Invoice).
const invoiceNumber = (prefix, fy, seq) => `${prefix}/${fy}/${String(seq).padStart(4, '0')}`;

const sameState = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Prices are exclusive of GST. Each line: taxable = qty x rate, tax = taxable x GST %.
// Same state as the seller: the tax is split CGST + SGST (half each, per line), otherwise IGST.
function calculate(items, intraState) {
  const lines = items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const taxable = round2(quantity * unitPrice);
    const tax = round2((taxable * item.gst_rate) / 100);
    return {
      ...item,
      quantity,
      unit_price: unitPrice,
      taxable_value: taxable,
      tax_amount: tax,
      line_total: round2(taxable + tax),
      sort_order: index,
    };
  });
  const subtotal = round2(lines.reduce((sum, l) => sum + l.taxable_value, 0));
  const totalTax = round2(lines.reduce((sum, l) => sum + l.tax_amount, 0));
  const cgst = intraState ? round2(lines.reduce((sum, l) => sum + round2(l.tax_amount / 2), 0)) : 0;
  // Grand total rounded to the nearest rupee; round_off is the +/- adjustment shown on the invoice.
  const exactTotal = round2(subtotal + totalTax);
  const grandTotal = Math.round(exactTotal);
  return {
    lines,
    totals: {
      subtotal,
      cgst,
      sgst: intraState ? round2(totalTax - cgst) : 0,
      igst: intraState ? 0 : totalTax,
      total_tax: totalTax,
      round_off: round2(grandTotal - exactTotal),
      grand_total: grandTotal,
    },
  };
}

// Tax per GST rate for the invoice's summary: [{ rate, taxable, cgst, sgst, igst, tax }].
function taxByRate(items, intraState) {
  const groups = new Map();
  for (const item of items) {
    const g = groups.get(item.gst_rate) || { rate: item.gst_rate, taxable: 0, tax: 0 };
    g.taxable = round2(g.taxable + item.taxable_value);
    g.tax = round2(g.tax + item.tax_amount);
    groups.set(item.gst_rate, g);
  }
  return [...groups.values()]
    .sort((a, b) => a.rate - b.rate)
    .map((g) => {
      const cgst = intraState ? round2(g.tax / 2) : 0;
      return { ...g, cgst, sgst: intraState ? round2(g.tax - cgst) : 0, igst: intraState ? 0 : g.tax };
    });
}

const methodLabel = (method) => PAYMENT_METHOD_LABELS[method] || method;

async function findOrFail(id) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

// Invoice with items, payments and the GST summary.
async function getById(id) {
  const invoice = await findOrFail(id);
  const [items, payments] = await Promise.all([
    vendorInvoiceRepository.findItems(id),
    vendorInvoiceRepository.findPayments(id),
  ]);
  return {
    ...invoice,
    items,
    payments: payments.map((p) => ({ ...p, method_label: methodLabel(p.method) })),
    tax_summary: taxByRate(items, invoice.intra_state),
  };
}

async function list(filters, pagination) {
  return vendorInvoiceRepository.findAll(filters, pagination);
}

async function summary(filters) {
  return vendorInvoiceRepository.summary(filters);
}

// Everything the invoice form needs in one call. invoiceId (when editing) leaves that invoice's own lines out
// of the stock figures, so the form shows what is available to it.
async function options(invoiceId = null) {
  const [{ types, vendors, products, accessories }, defaultTerms, productStock, accessoryStock] = await Promise.all([
    vendorInvoiceRepository.options(),
    settingService.vendorTerms(),
    stockRepository.productStock(invoiceId),
    stockRepository.accessoryStock(invoiceId),
  ]);
  const variants = await vendorInvoiceRepository.variantsOf(products.map((p) => p.id));
  return {
    // Active invoice types (Admin > Settings); one is picked when creating an invoice.
    types,
    vendors,
    // price = website selling price, GST-inclusive; the form converts it to a rate before GST.
    // variants = active combinations (price GST-inclusive too) — a product with any must have one picked.
    // stock = available units (purchased − invoiced − ordered); shared by all combinations. Shown as a warning only.
    products: products.map((p) => ({
      ...p,
      stock: productStock[p.id] ?? 0,
      variants: variants.filter((v) => Number(v.product_id) === Number(p.id) && v.is_active).map(({ id, label, sku, price }) => ({ id, label, sku, price })),
    })),
    // Active product accessories (Admin > Accessories); price is already the rate before GST.
    accessories: accessories.map((a) => ({ ...a, stock: accessoryStock[a.id] ?? 0 })),
    seller_state: env.invoice.sellerState,
    gst_rates: GST_RATES,
    default_gst_rate: env.invoice.gstRate,
    default_hsn: env.invoice.hsn,
    // Admin > Settings > Invoice Settings, else the built-in default.
    default_terms: defaultTerms,
    payment_methods: PAYMENT_METHODS.map((value) => ({ value, label: methodLabel(value) })),
  };
}

// Turns a validated request body into invoice columns + calculated lines.
// bill_* is copied from the vendor now, so later vendor edits don't change this invoice.
async function build(body, { allowInactiveVendorId = null } = {}) {
  const vendor = await vendorInvoiceRepository.findVendor(body.vendor_id);
  if (!vendor) throw ApiError.badRequest('Validation failed', { vendor_id: 'Vendor not found' });
  // Keeping an already-billed vendor on an edit is fine even if they were deactivated since.
  if (!vendor.is_active && vendor.id !== allowInactiveVendorId) {
    throw ApiError.badRequest('Validation failed', { vendor_id: 'This vendor is inactive' });
  }

  // A line is a product, an accessory, or custom text; the description defaults to the product / accessory name.
  const idsOf = (key) => [...new Set(body.items.map((i) => i[key]).filter(Boolean))];
  const [names, accessoryNames, variants] = await Promise.all([
    vendorInvoiceRepository.productNames(idsOf('product_id')),
    vendorInvoiceRepository.accessoryNames(idsOf('accessory_id')),
    vendorInvoiceRepository.variantsOf(idsOf('product_id')),
  ]);
  const fieldErrors = {};
  const items = body.items.map((item, i) => {
    if (item.product_id && !names[item.product_id]) fieldErrors[`items.${i}.product_id`] = 'Product not found';
    if (item.accessory_id && !accessoryNames[item.accessory_id]) fieldErrors[`items.${i}.accessory_id`] = 'Accessory not found';
    // A product with active combinations needs one picked; the chosen one must belong to it.
    let variant = null;
    if (item.product_id) {
      const own = variants.filter((v) => Number(v.product_id) === item.product_id);
      variant = item.variant_id ? own.find((v) => Number(v.id) === item.variant_id) : null;
      if (item.variant_id && !variant) fieldErrors[`items.${i}.variant_id`] = 'Not a combination of this product';
      else if (!item.variant_id && own.some((v) => v.is_active)) fieldErrors[`items.${i}.variant_id`] = 'Select the combination';
    }
    const productName = names[item.product_id] && (variant ? `${names[item.product_id]} (${variant.label})` : names[item.product_id]);
    return {
      product_id: item.product_id,
      variant_id: variant ? variant.id : null,
      accessory_id: item.accessory_id,
      description: item.description || productName || accessoryNames[item.accessory_id] || '',
      hsn_sac: item.hsn_sac,
      quantity: item.quantity,
      unit_price: item.unit_price,
      gst_rate: item.gst_rate,
    };
  });
  if (Object.keys(fieldErrors).length) throw ApiError.badRequest('Validation failed', fieldErrors);

  const intraState = sameState(vendor.state, env.invoice.sellerState);
  const { lines, totals } = calculate(items, intraState);
  return {
    invoice: {
      vendor_id: vendor.id,
      invoice_date: body.invoice_date,
      due_date: body.due_date ?? null,
      bill_name: vendor.name,
      bill_contact_person: vendor.contact_person,
      bill_mobile: vendor.mobile,
      bill_email: vendor.email,
      bill_gstin: vendor.gstin,
      bill_address: vendor.address,
      bill_city: vendor.city,
      bill_state: vendor.state,
      bill_pincode: vendor.pincode,
      intra_state: intraState,
      ...totals,
      notes: body.notes ?? null,
      terms: body.terms ?? null,
    },
    lines,
  };
}

// The type is chosen once, here: it decides the number series, so it can't change on edit.
async function create(body, adminId) {
  const type = await vendorInvoiceRepository.findType(body.type_id);
  if (!type || !type.is_active) {
    throw ApiError.badRequest('Validation failed', { type_id: type ? `${type.name} is inactive` : 'Invoice type not found' });
  }
  const { invoice, lines } = await build(body);
  const fy = financialYear(invoice.invoice_date);
  const id = await vendorInvoiceRepository.create(invoice, lines, {
    typeId: type.id,
    financialYear: fy,
    numberFor: (seq) => invoiceNumber(type.prefix, fy, seq),
    createdBy: adminId ?? null,
  });
  return getById(id);
}

// The invoice number and type never change. Cancelled invoices are read-only, and the new total
// can't drop below what the vendor has already paid.
async function update(id, body) {
  const existing = await findOrFail(id);
  const { invoice, lines } = await build(body, { allowInactiveVendorId: existing.vendor_id });
  await vendorInvoiceRepository.update(id, invoice, lines, (locked) => {
    if (locked.status === 'cancelled') throw ApiError.conflict('Cancelled invoices cannot be edited');
    if (invoice.grand_total < locked.amount_paid) {
      throw ApiError.conflict(
        `The new total (${invoice.grand_total}) is less than the ${locked.amount_paid} already received. Remove a payment first.`,
      );
    }
  });
  return getById(id);
}

// The number stays used (GST numbering has no gaps); the invoice is kept and marked cancelled.
async function cancel(id) {
  const invoice = await findOrFail(id);
  if (invoice.status === 'cancelled') throw ApiError.conflict('Invoice is already cancelled');
  if (invoice.amount_paid > 0) throw ApiError.conflict('This invoice has payments. Remove them before cancelling.');
  await vendorInvoiceRepository.cancel(id);
  return getById(id);
}

async function addPayment(id, payment) {
  await findOrFail(id);
  const amount = Number(payment.amount);
  await vendorInvoiceRepository.addPayment(id, { ...payment, amount }, (locked) => {
    if (locked.status === 'cancelled') throw ApiError.conflict('Payments cannot be added to a cancelled invoice');
    const balance = round2(locked.grand_total - locked.amount_paid);
    if (amount > balance) {
      throw ApiError.badRequest('Validation failed', { amount: `Amount cannot be more than the balance (${balance})` });
    }
  });
  return getById(id);
}

async function removePayment(id, paymentId) {
  await findOrFail(id);
  const found = await vendorInvoiceRepository.removePayment(id, paymentId, (locked) => {
    if (locked.status === 'cancelled') throw ApiError.conflict('Cancelled invoices cannot be changed');
  });
  if (!found) throw ApiError.notFound('Payment not found');
  return getById(id);
}

// Returns { filename, pdf (Buffer) }. An invoice saved without terms prints the default terms.
async function getPdf(id) {
  const invoice = await getById(id);
  const terms = invoice.terms || (await settingService.vendorTerms()) || null;
  const pdf = await renderVendorInvoicePdf({ seller: env.invoice, invoice: { ...invoice, terms } });
  const label = invoice.type_name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Invoice';
  return { filename: `${label}-${invoice.invoice_no.replace(/\//g, '-')}.pdf`, pdf };
}

module.exports = {
  list,
  summary,
  options,
  getById,
  create,
  update,
  cancel,
  addPayment,
  removePayment,
  getPdf,
  calculate,
  financialYear,
  methodLabel,
};
