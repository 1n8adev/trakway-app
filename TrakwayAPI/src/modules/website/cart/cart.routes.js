const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const requireCustomer = require('../../../middlewares/requireCustomer');
const cartValidation = require('./cart.validation');
const cartController = require('./cart.controller');

// Mounted at /api/cart — logged-in customers only.
const router = express.Router();
const body = [formFields(), cartValidation.normalize];

router.use(...requireCustomer);
router.get('/', cartController.get);
router.delete('/', cartController.clear);
router.post('/items', ...body, validate(cartValidation.add), cartController.add);
router.patch('/items/:id', ...body, validate(cartValidation.update), cartController.update);
router.delete('/items/:id', cartController.remove);

module.exports = router;
