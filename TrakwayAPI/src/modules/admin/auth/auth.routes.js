const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate, authorize } = require('../../../middlewares/auth');
const authValidation = require('./auth.validation');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/login', validate(authValidation.login), authController.login);
router.get('/me', authenticate, authorize('admin'), authController.me);

module.exports = router;
