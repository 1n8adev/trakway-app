const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const couponValidation = require('./coupon.validation');
const couponController = require('./coupon.controller');

// Mounted at /api/admin/coupons (admin JWT required — see admin.routes.js).
const router = express.Router();
const body = [formFields(), couponValidation.normalize];

router.get('/', couponController.list);
router.get('/:id', couponController.getById);
router.post('/', ...body, validate(couponValidation.create), couponController.create);
router.put('/:id', ...body, validate(couponValidation.update), couponController.update);
router.patch('/:id/status', ...body, validate(couponValidation.status), couponController.setStatus);
router.delete('/:id', couponController.remove);

module.exports = router;
