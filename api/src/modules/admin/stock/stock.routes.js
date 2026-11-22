const express = require('express');
const stockController = require('./stock.controller');

// Mounted at /api/admin/stock (admin JWT required — see admin.routes.js). Read-only, so no validation file.
const router = express.Router();

router.get('/', stockController.list);
router.get('/:type/:id/history', stockController.history);

module.exports = router;
