const express = require('express');
const categoryController = require('./category.controller');

// Mounted at /api/categories (public). Read-only, so there is no validation file.
const router = express.Router();

router.get('/', categoryController.list);

module.exports = router;
