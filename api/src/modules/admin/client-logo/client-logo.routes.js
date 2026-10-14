const express = require('express');
const validate = require('../../../middlewares/validate');
const { imageUpload, formFields } = require('../../../middlewares/upload');
const clientLogoValidation = require('./client-logo.validation');
const clientLogoController = require('./client-logo.controller');

// Mounted at /api/admin/client-logos (admin JWT required — see admin.routes.js).
// POST and PUT accept multipart/form-data (logo file in field "image") or JSON.
const router = express.Router();
const withImage = [imageUpload('client-logos'), clientLogoValidation.normalize];

router.get('/', clientLogoController.list);
router.get('/:id', clientLogoController.getById);
router.post('/', ...withImage, validate(clientLogoValidation.create), clientLogoController.create);
router.put('/:id', ...withImage, validate(clientLogoValidation.update), clientLogoController.update);
router.patch('/:id/status', formFields(), clientLogoValidation.normalize, validate(clientLogoValidation.status), clientLogoController.setStatus);
router.delete('/:id', clientLogoController.remove);

module.exports = router;
