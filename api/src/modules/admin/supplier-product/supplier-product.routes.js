const express = require('express');
const validate = require('../../../middlewares/validate');
const supplierProductValidation = require('./supplier-product.validation');
const supplierProductController = require('./supplier-product.controller');

// Mounted at /api/admin/supplier-products (admin JWT required — see admin.routes.js). JSON bodies.
const router = express.Router();
const { normalize } = supplierProductValidation;

router.get('/', supplierProductController.list);
router.get('/:id', supplierProductController.getById);
router.post('/', normalize, validate(supplierProductValidation.create), supplierProductController.create);
router.put('/:id', normalize, validate(supplierProductValidation.update), supplierProductController.update);
router.patch('/:id/status', normalize, validate(supplierProductValidation.status), supplierProductController.setStatus);
router.delete('/:id', supplierProductController.remove);

module.exports = router;
