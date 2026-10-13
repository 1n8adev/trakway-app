require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required env variables: ${missing.join(', ')}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  // Website customer login: short-lived JWT access token + rotating refresh token.
  customerAuth: {
    accessExpiresIn: process.env.CUSTOMER_ACCESS_EXPIRES_IN || '15m',
    refreshDays: Number(process.env.REFRESH_TOKEN_DAYS) || 30,
  },
  // Outgoing email (OTP codes). Without SMTP_HOST, non-production builds print emails to the console.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || 'Trakway <no-reply@localhost>',
  // Comma-separated addresses that get a copy of every new order. Empty = no admin email.
  adminOrderEmails: (process.env.ADMIN_ORDER_EMAIL || '').split(',').map((e) => e.trim()).filter(Boolean),
  // Comma-separated origins allowed to call the API from a browser,
  // e.g. "https://trakway.in,https://admin.trakway.in". Empty = allow all (development).
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};
