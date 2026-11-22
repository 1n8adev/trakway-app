const express = require('express');
const validate = require('../../../middlewares/validate');
const accessoryValidation = require('./product-accessory.validation');
const accessoryController = require('./product-accessory.controller');

// Mounted at /api/admin/product-accessories (admin JWT required — see admin.routes.js). JSON bodies.
const router = express.Router();
const { normalize } = accessoryValidation;

router.get('/', accessoryController.list);
router.get('/:id', accessoryController.getById);
router.post('/', normalize, validate(accessoryValidation.create), accessoryController.create);
router.put('/:id', normalize, validate(accessoryValidation.update), accessoryController.update);
router.patch('/:id/status', normalize, validate(accessoryValidation.status), accessoryController.setStatus);
router.delete('/:id', accessoryController.remove);

module.exports = router;
