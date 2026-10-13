const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const orderValidation = require('./order.validation');
const orderController = require('./order.controller');

// Mounted at /api/admin/orders (admin JWT required — see admin.routes.js).
const router = express.Router();
const body = [formFields(), orderValidation.normalize];

router.get('/', orderController.list);
router.get('/summary', orderController.summary); // before /:id
router.get('/:id', orderController.getById);
router.patch('/:id/status', ...body, validate(orderValidation.status), orderController.setStatus);
router.patch('/:id', ...body, validate(orderValidation.update), orderController.update);

module.exports = router;
