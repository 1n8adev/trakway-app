// Razorpay webhook (mounted at /api/payments). Public; trusted only after the signature check.
// Dashboard > Webhooks: URL https://<api>/api/payments/razorpay/webhook with RAZORPAY_WEBHOOK_SECRET.
const express = require('express');
const razorpay = require('../../utils/razorpay');
const paymentService = require('./payment.service');

const router = express.Router();

router.post('/razorpay/webhook', async (req, res) => {
  if (!razorpay.verifyWebhookSignature(req.rawBody, req.get('X-Razorpay-Signature'))) {
    return res.status(400).json({ success: false, statusCode: 400, message: 'Invalid signature' });
  }
  try {
    await paymentService.handleWebhook(req.body);
    return res.json({ success: true });
  } catch (err) {
    // Non-2xx makes Razorpay retry the event later.
    console.error(`Razorpay webhook ${req.body?.event} failed:`, err.message);
    return res.status(500).json({ success: false, statusCode: 500, message: 'Webhook processing failed' });
  }
});

module.exports = router;
