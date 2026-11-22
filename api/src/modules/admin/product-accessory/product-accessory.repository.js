// SQL queries for product accessories. Only this layer talks to the database.
const db = require('../../../config/db');
const mapping = require('../supplier-product/supplier-product.mapping');

const COLUMNS = `a.id, a.name, a.price, a.hsn_code, a.gst_rate, a.is_active, a.created_at, a.updated_at,
  (SELECT COUNT(DISTINCT it.invoice_id) FROM vendor_invoice_items it WHERE it.accessory_id = a.id)::INT AS invoice_count,
  (SELECT COUNT(*) FROM supplier_products sp WHERE sp.accessory_id = a.id)::INT AS supplier_product_count`;

// Filters: search (name, HSN), isActive.
async function findAll({ search, isActive }, { limit, offset }) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(a.name ILIKE $${params.length} OR a.hsn_code ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`a.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [list, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM product_accessories a ${where}
       ORDER BY a.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*)::INT AS total FROM product_accessories a ${where}`, params),
  ]);
  return { items: list.rows, total: count.rows[0].total };
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM product_accessories a WHERE a.id = $1`, [id]);
  return rows[0] || null;
}

// Supplier products mapped to this accessory.
async function findSupplierProducts(accessoryId) {
  const { rows } = await db.query(
    `SELECT sp.id, sp.name, sp.price, sp.hsn_code, sp.gst_rate, sp.is_active, sp.supplier_id, s.name AS supplier_name
     FROM supplier_products sp JOIN suppliers s ON s.id = sp.supplier_id
     WHERE sp.accessory_id = $1 ORDER BY s.name, sp.name`,
    [accessoryId],
  );
  return rows;
}

// Every supplier product with its current mapping (accessory or product), for the accessory form's picker.
const mappableSupplierProducts = () => mapping.findAllWithMapping();

// Mapping of the given supplier product ids.
const supplierProductsByIds = (ids) => mapping.findByIdsWithMapping(ids);

async function nameExists(name, excludeId = null) {
  const { rows } = await db.query(
    'SELECT 1 FROM product_accessories WHERE LOWER(name) = LOWER($1) AND ($2::BIGINT IS NULL OR id <> $2) LIMIT 1',
    [name, excludeId],
  );
  return rows.length > 0;
}

const WRITABLE = ['name', 'price', 'hsn_code', 'gst_rate', 'is_active'];

// Makes exactly these supplier products map to the accessory (others mapped to it are unmapped).
async function setSupplierProducts(client, accessoryId, ids) {
  await client.query(
    'UPDATE supplier_products SET accessory_id = NULL, updated_at = NOW() WHERE accessory_id = $1 AND NOT (id = ANY($2::BIGINT[]))',
    [accessoryId, ids],
  );
  if (ids.length) {
    await client.query(
      `UPDATE supplier_products SET accessory_id = $1, updated_at = NOW()
       WHERE id = ANY($2::BIGINT[]) AND accessory_id IS DISTINCT FROM $1`,
      [accessoryId, ids],
    );
  }
}

// supplierProductIds: undefined = leave the mapping alone.
async function create(data, supplierProductIds) {
  return db.withTransaction(async (client) => {
    const keys = WRITABLE.filter((key) => data[key] !== undefined);
    const { rows } = await client.query(
      `INSERT INTO product_accessories (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      keys.map((key) => data[key]),
    );
    if (supplierProductIds) await setSupplierProducts(client, rows[0].id, supplierProductIds);
    return rows[0].id;
  });
}

async function update(id, data, supplierProductIds) {
  await db.withTransaction(async (client) => {
    const keys = WRITABLE.filter((key) => data[key] !== undefined);
    if (keys.length) {
      await client.query(
        `UPDATE product_accessories SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW()
         WHERE id = $${keys.length + 1}`,
        [...keys.map((key) => data[key]), id],
      );
    }
    if (supplierProductIds) await setSupplierProducts(client, id, supplierProductIds);
  });
}

async function remove(id) {
  await db.query('DELETE FROM product_accessories WHERE id = $1', [id]);
}

module.exports = {
  findAll,
  findById,
  findSupplierProducts,
  mappableSupplierProducts,
  supplierProductsByIds,
  nameExists,
  create,
  update,
  remove,
};
