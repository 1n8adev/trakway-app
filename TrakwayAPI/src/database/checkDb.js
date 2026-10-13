const { pool, checkConnection } = require('../config/db');

checkConnection()
  .then((info) => {
    console.log('Database connected');
    console.log(`  database: ${info.db}`);
    console.log(`  server time: ${info.now.toISOString()}`);
    console.log(`  ${info.version}`);
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
