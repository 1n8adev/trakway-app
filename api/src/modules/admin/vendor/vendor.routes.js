const express = require('express');
const validate = require('../../../middlewares/validate');
const vendorValidation = require('./vendor.validation');
const vendorController = require('./vendor.controller');

// Mounted at /api/admin/vendors (admin JWT required — see admin.routes.js). JSON bodies.
const router = express.Router();

router.get('/', vendorController.list);
router.get('/:id', vendorController.getById);
router.post('/', vendorValidation.normalize, validate(vendorValidation.create), vendorController.create);
router.put('/:id', vendorValidation.normalize, validate(vendorValidation.update), vendorController.update);
router.patch('/:id/status', vendorValidation.normalize, validate(vendorValidation.status), vendorController.setStatus);
router.delete('/:id', vendorController.remove);

module.exports = router;
