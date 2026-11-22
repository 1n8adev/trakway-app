const express = require('express');
const validate = require('../../../middlewares/validate');
const supplierValidation = require('./supplier.validation');
const supplierController = require('./supplier.controller');

// Mounted at /api/admin/suppliers (admin JWT required — see admin.routes.js). JSON bodies.
const router = express.Router();

router.get('/', supplierController.list);
router.get('/:id', supplierController.getById);
router.post('/', supplierValidation.normalize, validate(supplierValidation.create), supplierController.create);
router.put('/:id', supplierValidation.normalize, validate(supplierValidation.update), supplierController.update);
router.patch('/:id/status', supplierValidation.normalize, validate(supplierValidation.status), supplierController.setStatus);
router.delete('/:id', supplierController.remove);

module.exports = router;
