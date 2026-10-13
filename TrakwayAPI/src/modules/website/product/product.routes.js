const express = require('express');
const productController = require('./product.controller');

// Mounted at /api/products (public). Read-only, so there is no validation file.
const router = express.Router();

router.get('/', productController.list);
router.get('/latest', productController.latest); // before /:slug
router.get('/:slug', productController.getBySlug);

module.exports = router;
