const env = require('./config/env');
const app = require('./app');
const { pool, checkConnection } = require('./config/db');
const paymentService = require('./modules/payment/payment.service');

async function start() {
  try {
    const db = await checkConnection();
    console.log(`PostgreSQL connected: ${db.db}`);
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`Trakway API running on http://localhost:${env.port}`);
  });

  // Cancels online orders left unpaid (checks Razorpay first, so a missed webhook still counts as paid).
  let expiryTimer = null;
  if (paymentService.isEnabled()) {
    const runExpiry = () => paymentService.expireStalePending().catch((err) => console.error('Payment expiry job failed:', err.message));
    expiryTimer = setInterval(runExpiry, 5 * 60 * 1000);
    runExpiry();
  }

  const shutdown = () => {
    clearInterval(expiryTimer);
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
