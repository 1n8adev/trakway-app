const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const attributeValidation = require('./attribute.validation');
const attributeController = require('./attribute.controller');

// Mounted at /api/admin/attributes (admin JWT required — see admin.routes.js).
// Accepts JSON, form-data or urlencoded bodies.
const router = express.Router();
const body = [formFields(), attributeValidation.normalize];

router.get('/', attributeController.list);
router.get('/:id', attributeController.getById);
router.post('/', ...body, validate(attributeValidation.create), attributeController.create);
router.put('/:id', ...body, validate(attributeValidation.update), attributeController.update);
router.patch('/:id/status', ...body, validate(attributeValidation.status), attributeController.setStatus);
router.delete('/:id', attributeController.remove);

router.post('/:id/values', ...body, validate(attributeValidation.createValue), attributeController.addValue);
router.put('/:id/values/:valueId', ...body, validate(attributeValidation.updateValue), attributeController.updateValue);
router.patch('/:id/values/:valueId/status', ...body, validate(attributeValidation.status), attributeController.setValueStatus);
router.delete('/:id/values/:valueId', attributeController.removeValue);

module.exports = router;
