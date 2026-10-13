const { Pool, types } = require('pg');
const env = require('./env');

// Return BIGINT (BIGSERIAL ids, COUNT(*)) as numbers instead of strings.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));
// Return NUMERIC (prices, NUMERIC(12,2)) as numbers: "4000.00" -> 4000.
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));
// Return DATE as "YYYY-MM-DD" text; a JS Date would shift the day across timezones.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool(env.db);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside BEGIN/COMMIT, rolling back on error.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function checkConnection() {
  const { rows } = await pool.query('SELECT NOW() AS now, current_database() AS db, version() AS version');
  return rows[0];
}

module.exports = { pool, query, withTransaction, checkConnection };
