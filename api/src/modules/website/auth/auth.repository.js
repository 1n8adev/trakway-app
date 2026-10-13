// SQL queries for customer accounts, email OTPs and refresh tokens. Only this layer talks to the database.
const db = require('../../../config/db');

const USER_COLUMNS = `id, name, email, phone, password_hash, email_verified_at, is_active,
  last_login_at, created_at, updated_at`;

// ---- users ----

async function findUserByEmail(email) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createUser({ name, email, phone, passwordHash }) {
  const { rows } = await db.query(
    'INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, email, phone, passwordHash],
  );
  return rows[0].id;
}

// Updates only the given columns (name, phone, password_hash, email_verified_at, last_login_at).
async function updateUser(id, data, client = db.pool) {
  const fields = ['name', 'phone', 'password_hash', 'email_verified_at', 'last_login_at']
    .filter((key) => data[key] !== undefined);
  if (!fields.length) return;
  const sets = fields.map((key, i) => `${key} = $${i + 1}`);
  const params = [...fields.map((key) => data[key]), id];
  await client.query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
}

// ---- email OTPs ----

// Newest code for this email + purpose that is not used or replaced yet.
async function findActiveOtp(email, purpose) {
  const { rows } = await db.query(
    `SELECT id, code_hash, attempts, expires_at FROM email_otps
     WHERE LOWER(email) = LOWER($1) AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [email, purpose],
  );
  return rows[0] || null;
}

// When the last code was sent, and how many were sent in the past hour.
async function otpSendStats(email, purpose) {
  const { rows } = await db.query(
    `SELECT MAX(created_at) AS last_sent_at,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS sent_last_hour
     FROM email_otps WHERE LOWER(email) = LOWER($1) AND purpose = $2`,
    [email, purpose],
  );
  return rows[0];
}

// Replaces any active code with a new one (older codes stop working).
async function createOtp({ email, purpose, codeHash, expiresAt }) {
  return db.withTransaction(async (client) => {
    await client.query(
      `UPDATE email_otps SET consumed_at = NOW()
       WHERE LOWER(email) = LOWER($1) AND purpose = $2 AND consumed_at IS NULL`,
      [email, purpose],
    );
    const { rows } = await client.query(
      'INSERT INTO email_otps (email, purpose, code_hash, expires_at) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, purpose, codeHash, expiresAt],
    );
    return rows[0].id;
  });
}

async function deleteOtp(id) {
  await db.query('DELETE FROM email_otps WHERE id = $1', [id]);
}

async function incrementOtpAttempts(id) {
  await db.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [id]);
}

// Marks a code as used. Returns false if it was already used (e.g. two requests at once).
async function consumeOtp(id) {
  const { rowCount } = await db.query(
    'UPDATE email_otps SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL',
    [id],
  );
  return rowCount === 1;
}

// ---- refresh tokens ----

async function createRefreshToken({ userId, tokenHash, expiresAt, userAgent, ip }, client = db.pool) {
  const { rows } = await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, tokenHash, expiresAt, userAgent, ip],
  );
  return rows[0].id;
}

async function findRefreshToken(tokenHash) {
  const { rows } = await db.query(
    'SELECT id, user_id, expires_at, revoked_at, replaced_by FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );
  return rows[0] || null;
}

// Revokes `id` in favour of `replacedBy`. Returns false if it was revoked meanwhile.
async function rotateRefreshToken(id, replacedBy, client) {
  const { rowCount } = await client.query(
    'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = $2 WHERE id = $1 AND revoked_at IS NULL',
    [id, replacedBy],
  );
  return rowCount === 1;
}

async function revokeRefreshToken(id) {
  await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL', [id]);
}

// Logs the user out everywhere.
async function revokeAllRefreshTokens(userId, client = db.pool) {
  await client.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  findActiveOtp,
  otpSendStats,
  createOtp,
  deleteOtp,
  incrementOtpAttempts,
  consumeOtp,
  createRefreshToken,
  findRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
};
