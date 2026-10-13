// Creates an admin user, or resets the password if the email already exists.
// Usage: npm run seed:admin -- <email> [password] [name]
// If no password is given, a random one is generated and printed once.
const crypto = require('crypto');
const { pool } = require('../../config/db');
const password = require('../../utils/password');

async function createAdmin() {
  const [email, givenPassword, name = 'Admin'] = process.argv.slice(2);
  if (!email) {
    throw new Error('Usage: npm run seed:admin -- <email> [password] [name]');
  }
  if (givenPassword && givenPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const plain = givenPassword || crypto.randomBytes(12).toString('base64url');
  const hashed = await password.hash(plain);

  const { rows } = await pool.query(
    `INSERT INTO admin_users (name, email, password_hash)
     VALUES ($1, LOWER($2), $3)
     ON CONFLICT (LOWER(email))
     DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = TRUE, updated_at = NOW()
     RETURNING id, email, (xmax = 0) AS inserted`,
    [name, email, hashed],
  );

  const admin = rows[0];
  console.log(`${admin.inserted ? 'Created' : 'Updated'} admin #${admin.id}: ${admin.email}`);
  if (!givenPassword) {
    console.log(`Generated password: ${plain}`);
    console.log('Store it now — it will not be shown again.');
  }
}

createAdmin()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
