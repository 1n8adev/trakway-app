const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const faqValidation = require('./faq.validation');
const faqController = require('./faq.controller');

// Mounted at /api/admin/faqs (admin JWT required — see admin.routes.js).
// Accepts JSON, form-data or urlencoded bodies.
const router = express.Router();
const body = [formFields(), faqValidation.normalize];

router.get('/', faqController.list);
router.put('/reorder', ...body, validate(faqValidation.reorder), faqController.reorder); // before /:id
router.get('/:id', faqController.getById);
router.post('/', ...body, validate(faqValidation.create), faqController.create);
router.put('/:id', ...body, validate(faqValidation.update), faqController.update);
router.patch('/:id/status', ...body, validate(faqValidation.status), faqController.setStatus);
router.delete('/:id', faqController.remove);

module.exports = router;
