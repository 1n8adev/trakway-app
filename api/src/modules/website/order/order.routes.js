const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const requireCustomer = require('../../../middlewares/requireCustomer');
const orderValidation = require('./order.validation');
const orderController = require('./order.controller');

// Checkout (mounted at /api/checkout) and customer orders (mounted at /api/orders) — logged-in customers only.
const body = [formFields(), orderValidation.normalize];

const checkoutRouter = express.Router();
checkoutRouter.use(...requireCustomer);
checkoutRouter.post('/summary', ...body, validate(orderValidation.summary), orderController.summary);

const ordersRouter = express.Router();
ordersRouter.use(...requireCustomer);
ordersRouter.post('/', ...body, validate(orderValidation.place), orderController.place);
ordersRouter.get('/', orderController.list);
ordersRouter.get('/:orderNo', orderController.get);
ordersRouter.post('/:orderNo/cancel', ...body, validate(orderValidation.cancel), orderController.cancel);

module.exports = { checkoutRouter, ordersRouter };
