const express = require('express');
const clientLogoController = require('./client-logo.controller');

// Mounted at /api/client-logos (public). Read-only, so there is no validation file.
const router = express.Router();

router.get('/', clientLogoController.list);

module.exports = router;
