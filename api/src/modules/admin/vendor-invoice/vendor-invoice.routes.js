const express = require('express');
const validate = require('../../../middlewares/validate');
const vendorInvoiceValidation = require('./vendor-invoice.validation');
const vendorInvoiceController = require('./vendor-invoice.controller');

// Mounted at /api/admin/vendor-invoices (admin JWT required — see admin.routes.js). JSON bodies.
// POST / and PUT /:id take the whole invoice; items are replaced and all amounts are calculated here.
const router = express.Router();
const { normalize } = vendorInvoiceValidation;

router.get('/', vendorInvoiceController.list);
router.get('/summary', vendorInvoiceController.summary);
router.get('/options', vendorInvoiceController.options);
router.get('/:id', vendorInvoiceController.getById);
router.get('/:id/pdf', vendorInvoiceController.pdf);
router.post('/', normalize, validate(vendorInvoiceValidation.invoice), vendorInvoiceController.create);
router.put('/:id', normalize, validate(vendorInvoiceValidation.invoice), vendorInvoiceController.update);
router.patch('/:id/cancel', vendorInvoiceController.cancel);
router.post('/:id/payments', normalize, validate(vendorInvoiceValidation.payment), vendorInvoiceController.addPayment);
router.delete('/:id/payments/:paymentId', vendorInvoiceController.removePayment);

module.exports = router;
