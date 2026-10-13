const env = require('./config/env');
const app = require('./app');
const { pool, checkConnection } = require('./config/db');

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

  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
