const express = require('express');
const { checkConnection } = require('../config/db');
const adminRoutes = require('../modules/admin/admin.routes');
const websiteRoutes = require('../modules/website/website.routes');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const db = await checkConnection();
    res.json({ success: true, statusCode: 200, server: 'ok', database: 'connected', db: db.db, time: db.now });
  } catch (err) {
    res.status(503).json({ success: false, statusCode: 503, server: 'ok', database: 'disconnected', error: err.message });
  }
});

router.use('/admin', adminRoutes);
router.use('/', websiteRoutes);

module.exports = router;
