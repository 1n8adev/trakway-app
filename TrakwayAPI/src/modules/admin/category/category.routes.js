const express = require('express');
const validate = require('../../../middlewares/validate');
const { imageUpload, formFields } = require('../../../middlewares/upload');
const categoryValidation = require('./category.validation');
const categoryController = require('./category.controller');

// Mounted at /api/admin/categories (admin JWT required — see admin.routes.js).
// POST and PUT accept JSON or multipart/form-data (image file in field "image").
const router = express.Router();
const withImage = [imageUpload('categories'), categoryValidation.normalize];

router.get('/', categoryController.list);
router.get('/tree', categoryController.tree);
router.get('/:id', categoryController.getById);
router.post('/', ...withImage, validate(categoryValidation.create), categoryController.create);
router.put('/:id', ...withImage, validate(categoryValidation.update), categoryController.update);
router.patch('/:id/status', formFields(), categoryValidation.normalize, validate(categoryValidation.status), categoryController.setStatus);
router.delete('/:id', categoryController.remove);

module.exports = router;
