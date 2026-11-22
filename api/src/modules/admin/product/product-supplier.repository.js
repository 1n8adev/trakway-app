// SQL for the product "Suppliers" tab: which supplier products are this product.
const db = require('../../../config/db');

// Makes exactly these supplier products map to the product; others mapped to it are unmapped.
async function replace(productId, ids) {
  await db.withTransaction(async (client) => {
    await client.query(
      `UPDATE supplier_products SET product_id = NULL, updated_at = NOW()
       WHERE product_id = $1 AND NOT (id = ANY($2::BIGINT[]))`,
      [productId, ids],
    );
    if (ids.length) {
      await client.query(
        `UPDATE supplier_products SET product_id = $1, updated_at = NOW()
         WHERE id = ANY($2::BIGINT[]) AND product_id IS DISTINCT FROM $1`,
        [productId, ids],
      );
    }
  });
}

module.exports = { replace };
