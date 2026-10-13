const express = require('express');
const faqController = require('./faq.controller');

// Mounted at /api/faqs (public). Read-only, so there is no validation file.
const router = express.Router();

router.get('/', faqController.list);

module.exports = router;
