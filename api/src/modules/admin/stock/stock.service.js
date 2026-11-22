// Stock page: available stock per product / accessory and each item's history. Read-only — stock is
// calculated from purchases, vendor invoices and website orders (manual adjustments come later).
const ApiError = require('../../../utils/ApiError');
const { round2 } = require('../../../utils/money');
const stockRepository = require('./stock.repository');

const TYPES = ['product', 'accessory'];

// in_stock > 0, out_of_stock = 0, negative < 0 (sold more than purchased — purchases not entered yet).
function statusOf(stock) {
  if (stock > 0) return 'in_stock';
  if (stock < 0) return 'negative';
  return 'out_of_stock';
}

function shape(row) {
  const purchased = Number(row.purchased);
  const invoiced = Number(row.invoiced);
  const ordered = Number(row.ordered);
  const stock = round2(purchased - invoiced - ordered);
  return { ...row, purchased, invoiced, ordered, sold: round2(invoiced + ordered), stock, status: statusOf(stock) };
}

// filters: type (product|accessory), search (name), status (in_stock|out_of_stock|negative), active (true|false).
// Returns { items, summary } — summary counts all items of the chosen type (before search / status filters).
async function list({ type, search, status, active }) {
  let items = (await stockRepository.overview()).map(shape);
  if (type) items = items.filter((i) => i.type === type);
  const summary = {
    total: items.length,
    in_stock: items.filter((i) => i.status === 'in_stock').length,
    out_of_stock: items.filter((i) => i.status === 'out_of_stock').length,
    negative: items.filter((i) => i.status === 'negative').length,
    units: round2(items.reduce((sum, i) => sum + Math.max(i.stock, 0), 0)),
  };
  if (active !== undefined) items = items.filter((i) => i.is_active === active);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q) || (i.subtitle || '').toLowerCase().includes(q));
  }
  if (status) items = items.filter((i) => i.status === status);
  return { items, summary };
}

// { item: { type, id, name, ..., purchased, sold, stock, status }, movements: newest first, each with balance after it }.
async function history(type, id) {
  if (!TYPES.includes(type)) throw ApiError.badRequest('Type must be product or accessory');
  const item = await stockRepository.findItem(type, id);
  if (!item) throw ApiError.notFound(type === 'product' ? 'Product not found' : 'Accessory not found');
  const rows = await stockRepository.movements(type, id);
  let balance = 0;
  let purchased = 0;
  let invoiced = 0;
  let ordered = 0;
  const movements = rows.map((r) => {
    const quantity = Number(r.quantity);
    balance = round2(balance + quantity);
    if (r.kind === 'purchase') purchased = round2(purchased + quantity);
    else if (r.kind === 'invoice') invoiced = round2(invoiced - quantity);
    else ordered = round2(ordered - quantity);
    return { ...r, quantity, balance };
  });
  return {
    item: shape({ ...item, type, purchased, invoiced, ordered }),
    movements: movements.reverse(),
  };
}

module.exports = { TYPES, list, history };
