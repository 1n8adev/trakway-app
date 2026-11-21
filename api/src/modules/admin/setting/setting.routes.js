const express = require('express');
const validate = require('../../../middlewares/validate');
const settingValidation = require('./setting.validation');
const settingController = require('./setting.controller');

// Mounted at /api/admin/settings (admin JWT required — see admin.routes.js). JSON bodies.
const router = express.Router();

// Default terms & conditions for vendor invoices.
router.get('/invoice', settingController.getInvoice);
router.put('/invoice', validate(settingValidation.invoice), settingController.updateInvoice);

module.exports = router;
