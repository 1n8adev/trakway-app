const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const requireCustomer = require('../../../middlewares/requireCustomer');
const addressValidation = require('./address.validation');
const addressController = require('./address.controller');

// Mounted at /api/addresses — logged-in customers only.
const router = express.Router();
const body = [formFields(), addressValidation.normalize];

router.use(...requireCustomer);
router.get('/', addressController.list);
router.post('/', ...body, validate(addressValidation.create), addressController.create);
router.put('/:id', ...body, validate(addressValidation.update), addressController.update);
router.patch('/:id/default', addressController.setDefault);
router.delete('/:id', addressController.remove);

module.exports = router;
