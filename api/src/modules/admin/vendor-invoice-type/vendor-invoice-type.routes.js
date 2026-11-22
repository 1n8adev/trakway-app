const express = require('express');
const validate = require('../../../middlewares/validate');
const typeValidation = require('./vendor-invoice-type.validation');
const typeController = require('./vendor-invoice-type.controller');

// Mounted at /api/admin/vendor-invoice-types (admin JWT required — see admin.routes.js). JSON bodies.
const router = express.Router();
const { normalize } = typeValidation;

router.get('/', typeController.list);
router.post('/', normalize, validate(typeValidation.create), typeController.create);
router.put('/:id', normalize, validate(typeValidation.update), typeController.update);
router.patch('/:id/status', normalize, validate(typeValidation.status), typeController.setStatus);
router.delete('/:id', typeController.remove);

module.exports = router;
