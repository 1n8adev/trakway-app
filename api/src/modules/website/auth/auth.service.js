// Business logic for website customer accounts: register + email OTP, login, refresh tokens,
// forgot/reset password. Throws ApiError on rule violations.
const crypto = require('crypto');
const env = require('../../../config/env');
const db = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const jwt = require('../../../utils/jwt');
const password = require('../../../utils/password');
const { sendMail } = require('../../../utils/mailer');
const { otpEmail } = require('../../../utils/emailTemplates');
const authRepository = require('./auth.repository');

const OTP_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRES_IN = '15m';
// A refresh token reused within this window after rotation is treated as two parallel requests
// from the same app (e.g. two tabs), not as theft.
const REUSE_GRACE_SECONDS = 30;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashOtp = (email, purpose, code) => crypto
  .createHmac('sha256', env.jwt.secret).update(`${purpose}:${email.toLowerCase()}:${code}`).digest('hex');
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
// Changes whenever the password changes, so reset tokens become single-use.
const passwordFingerprint = (passwordHash) => sha256(passwordHash).slice(0, 16);

const fail = (field, message) => ApiError.badRequest(message, { [field]: message });

// Safe user fields for responses.
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    email_verified: Boolean(user.email_verified_at),
    created_at: user.created_at,
  };
}

// ---- OTP ----

// Creates and emails a new code. Enforces a 60 s gap between codes and 5 codes per hour.
async function sendOtp({ email, purpose, name }) {
  const stats = await authRepository.otpSendStats(email, purpose);
  if (stats.last_sent_at) {
    const waitSeconds = OTP_RESEND_SECONDS - Math.floor((Date.now() - new Date(stats.last_sent_at)) / 1000);
    if (waitSeconds > 0) {
      throw new ApiError(429, `Please wait ${waitSeconds} seconds before requesting a new code`, { retry_after: waitSeconds });
    }
  }
  if (stats.sent_last_hour >= OTP_MAX_PER_HOUR) {
    throw new ApiError(429, 'Too many codes requested. Please try again after an hour.');
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const otpId = await authRepository.createOtp({
    email,
    purpose,
    codeHash: hashOtp(email, purpose, code),
    expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000),
  });
  try {
    await sendMail({ to: email, ...otpEmail({ name, code, purpose, minutes: OTP_MINUTES }) });
  } catch (err) {
    await authRepository.deleteOtp(otpId);
    console.error('OTP email failed:', err.message);
    throw new ApiError(503, 'Could not send the email. Please try again in a few minutes.');
  }
  return { email, otp_expires_in: OTP_MINUTES * 60, resend_after: OTP_RESEND_SECONDS };
}

// Checks a code and marks it used. Wrong codes count toward OTP_MAX_ATTEMPTS.
async function checkOtp({ email, purpose, code }) {
  const otp = await authRepository.findActiveOtp(email, purpose);
  if (!otp || new Date(otp.expires_at) < new Date()) {
    throw fail('otp', 'This code has expired. Please request a new one.');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw fail('otp', 'Too many wrong attempts. Please request a new code.');
  }
  if (!sameHash(otp.code_hash, hashOtp(email, purpose, code))) {
    await authRepository.incrementOtpAttempts(otp.id);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    throw fail('otp', left > 0 ? `Incorrect code. ${left} attempt(s) left.` : 'Too many wrong attempts. Please request a new code.');
  }
  if (!(await authRepository.consumeOtp(otp.id))) {
    throw fail('otp', 'This code has already been used. Please request a new one.');
  }
}

// ---- tokens ----

async function issueTokens(user, meta, client) {
  const accessToken = jwt.sign({ id: user.id, email: user.email, type: 'customer' }, env.customerAuth.accessExpiresIn);
  const { exp, iat } = jwt.verify(accessToken);
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const refreshExpiresAt = new Date(Date.now() + env.customerAuth.refreshDays * 24 * 60 * 60 * 1000);
  const refreshId = await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  }, client);
  return {
    refreshId,
    tokens: {
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: exp - iat,
      refresh_token: refreshToken,
      refresh_token_expires_at: refreshExpiresAt,
    },
  };
}

// Tokens + user, after a successful login / verification.
async function startSession(user, meta) {
  await authRepository.updateUser(user.id, { last_login_at: new Date() });
  const { tokens } = await issueTokens(user, meta);
  return { ...tokens, user: publicUser(await authRepository.findUserById(user.id)) };
}

// ---- register ----

// Creates the account (unverified) and emails a code. Re-registering an unverified email
// updates its details and sends a new code; a verified email is taken.
async function register({ name, email, phone, password: plain }, meta) {
  const existing = await authRepository.findUserByEmail(email);
  if (existing?.email_verified_at) {
    throw ApiError.conflict('This email is already registered. Please log in.', { email: 'This email is already registered' });
  }
  const passwordHash = await password.hash(plain);
  if (existing) {
    await authRepository.updateUser(existing.id, { name, phone: phone ?? null, password_hash: passwordHash });
  } else {
    await authRepository.createUser({ name, email, phone: phone ?? null, passwordHash }).catch((err) => {
      if (err.code === '23505') throw ApiError.conflict('This email is already registered', { email: 'This email is already registered' });
      throw err;
    });
  }
  return sendOtp({ email, purpose: 'register', name });
}

async function resendRegisterOtp({ email }) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) throw fail('email', 'No registration found for this email. Please register first.');
  if (user.email_verified_at) throw ApiError.conflict('This email is already verified. Please log in.');
  return sendOtp({ email: user.email, purpose: 'register', name: user.name });
}

async function verifyRegistration({ email, otp }, meta) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) throw fail('email', 'No registration found for this email. Please register first.');
  if (user.email_verified_at) throw ApiError.conflict('This email is already verified. Please log in.');
  await checkOtp({ email: user.email, purpose: 'register', code: otp });
  await authRepository.updateUser(user.id, { email_verified_at: new Date() });
  return startSession(user, meta);
}

// ---- login / session ----

// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const dummyHash = password.hash(crypto.randomBytes(16).toString('hex'));

async function login({ email, password: plain }, meta) {
  const user = await authRepository.findUserByEmail(email);
  const valid = await password.compare(plain, user?.password_hash || (await dummyHash));
  if (!user || !valid) throw ApiError.unauthorized('Invalid email or password');
  if (!user.email_verified_at) {
    throw new ApiError(403, 'Please verify your email to continue', {
      email: 'Email not verified', code: 'EMAIL_NOT_VERIFIED',
    });
  }
  if (!user.is_active) throw ApiError.forbidden('Your account has been disabled. Please contact support.');
  return startSession(user, meta);
}

const SESSION_EXPIRED = 'Session expired. Please log in again.';

// Exchanges a refresh token for new tokens; the old refresh token stops working.
async function refresh({ refresh_token: refreshToken }, meta) {
  const row = await authRepository.findRefreshToken(sha256(refreshToken));
  if (!row) throw ApiError.unauthorized(SESSION_EXPIRED);
  if (row.revoked_at) {
    // An old token used again long after rotation: possibly stolen — log the user out everywhere.
    const secondsSince = (Date.now() - new Date(row.revoked_at)) / 1000;
    if (row.replaced_by && secondsSince > REUSE_GRACE_SECONDS) {
      await authRepository.revokeAllRefreshTokens(row.user_id);
    }
    throw ApiError.unauthorized(SESSION_EXPIRED);
  }
  if (new Date(row.expires_at) < new Date()) throw ApiError.unauthorized(SESSION_EXPIRED);

  const user = await authRepository.findUserById(row.user_id);
  if (!user || !user.is_active || !user.email_verified_at) {
    await authRepository.revokeRefreshToken(row.id);
    throw ApiError.unauthorized(SESSION_EXPIRED);
  }

  const tokens = await db.withTransaction(async (client) => {
    const issued = await issueTokens(user, meta, client);
    if (!(await authRepository.rotateRefreshToken(row.id, issued.refreshId, client))) {
      throw ApiError.unauthorized(SESSION_EXPIRED); // used by a parallel request a moment ago
    }
    return issued.tokens;
  });
  return { ...tokens, user: publicUser(user) };
}

async function logout({ refresh_token: refreshToken }) {
  const row = await authRepository.findRefreshToken(sha256(refreshToken));
  if (row) await authRepository.revokeRefreshToken(row.id);
}

async function me(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.is_active) throw ApiError.unauthorized('Account not found or disabled');
  return publicUser(user);
}

// ---- forgot / reset password ----

const RESET_SENT = 'If an account exists for this email, a verification code has been sent.';

// Always answers the same way, so it can't be used to find out which emails have accounts.
async function forgotPassword({ email }) {
  const user = await authRepository.findUserByEmail(email);
  if (user?.email_verified_at && user.is_active) {
    try {
      await sendOtp({ email: user.email, purpose: 'reset_password', name: user.name });
    } catch (err) {
      if (err.statusCode === 429) throw err; // tell them to wait; same message shape for every email
      console.error('Forgot-password OTP not sent:', err.message);
    }
  }
  return { message: RESET_SENT, otp_expires_in: OTP_MINUTES * 60, resend_after: OTP_RESEND_SECONDS };
}

// Step 2: checks the code and returns a short-lived reset token for step 3.
async function verifyResetOtp({ email, otp }) {
  const user = await authRepository.findUserByEmail(email);
  if (!user?.email_verified_at || !user.is_active) throw fail('otp', 'This code has expired. Please request a new one.');
  await checkOtp({ email: user.email, purpose: 'reset_password', code: otp });
  const resetToken = jwt.sign(
    { id: user.id, type: 'password_reset', pwd: passwordFingerprint(user.password_hash) },
    RESET_TOKEN_EXPIRES_IN,
  );
  const { exp, iat } = jwt.verify(resetToken);
  return { reset_token: resetToken, expires_in: exp - iat };
}

// Step 3: sets the new password and logs the user out of every device.
async function resetPassword({ reset_token: resetToken, password: plain }) {
  const invalid = () => fail('reset_token', 'This reset link has expired. Please start again.');
  let payload;
  try {
    payload = jwt.verify(resetToken);
  } catch {
    throw invalid();
  }
  if (payload.type !== 'password_reset') throw invalid();
  const user = await authRepository.findUserById(payload.id);
  if (!user || !user.is_active || payload.pwd !== passwordFingerprint(user.password_hash)) throw invalid();

  const passwordHash = await password.hash(plain);
  await db.withTransaction(async (client) => {
    await authRepository.updateUser(user.id, { password_hash: passwordHash }, client);
    await authRepository.revokeAllRefreshTokens(user.id, client);
  });
}

module.exports = {
  register,
  resendRegisterOtp,
  verifyRegistration,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
