const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const userValidation = require('./user.validation');
const userController = require('./user.controller');

// Mounted at /api/admin/users (admin JWT required — see admin.routes.js). Website customers.
const router = express.Router();

router.get('/', userController.list);
router.get('/summary', userController.summary); // before /:id
router.get('/:id', userController.getById);
router.patch('/:id/status', formFields(), userValidation.normalize, validate(userValidation.status), userController.setStatus);

module.exports = router;
