const express = require('express');
const validate = require('../../../middlewares/validate');
const { documentUpload } = require('../../../middlewares/upload');
const purchaseValidation = require('./purchase.validation');
const purchaseController = require('./purchase.controller');
const paymentValidation = require('./purchase-payment.validation');
const paymentController = require('./purchase-payment.controller');

// Mounted at /api/admin/purchases (admin JWT required — see admin.routes.js).
// Create / update accept JSON or multipart/form-data (items as a JSON string, bill file in `bill_file`).
const router = express.Router();
const billUpload = documentUpload('purchases', 'bill_file', { maxMb: 10 });
const { normalize } = purchaseValidation;

router.get('/options', purchaseController.options);
router.get('/', purchaseController.list);
router.get('/:id', purchaseController.getById);
router.get('/:id/bill', purchaseController.billFile);
router.post('/', billUpload, normalize, validate(purchaseValidation.create), purchaseController.create);
router.put('/:id', billUpload, normalize, validate(purchaseValidation.update), purchaseController.update);
router.delete('/:id', purchaseController.remove);

// Payments Trakway sends the supplier against this bill (JSON: { paid_on, amount, method, reference, notes? }).
router.get('/:id/payments', paymentController.list);
router.post('/:id/payments', paymentValidation.normalize, validate(paymentValidation.payment), paymentController.create);
router.put('/:id/payments/:paymentId', paymentValidation.normalize, validate(paymentValidation.payment), paymentController.update);
router.delete('/:id/payments/:paymentId', paymentController.remove);

module.exports = router;
