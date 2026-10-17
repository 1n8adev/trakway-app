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
  // Seller details printed on tax invoices. The defaults are PLACEHOLDERS — set the real values in .env.
  // INVOICE_SELLER_ADDRESS uses "|" between lines. Prices are treated as GST-inclusive at INVOICE_GST_RATE %.
  invoice: {
    sellerName: process.env.INVOICE_SELLER_NAME || 'Trakway Technologies Pvt. Ltd. (SAMPLE)',
    sellerAddress: (process.env.INVOICE_SELLER_ADDRESS || 'No. 12, Sample Street|Anna Nagar, Chennai - 600040')
      .split('|')
      .map((line) => line.trim())
      .filter(Boolean),
    sellerState: process.env.INVOICE_SELLER_STATE || 'Tamil Nadu',
    sellerGstin: process.env.INVOICE_SELLER_GSTIN || '33ABCDE1234F1Z5',
    sellerPhone: process.env.INVOICE_SELLER_PHONE || '+91 98765 43210',
    sellerEmail: process.env.INVOICE_SELLER_EMAIL || 'billing@trakwaytechnologies.com',
    prefix: process.env.INVOICE_PREFIX || 'TW',
    gstRate: Number(process.env.INVOICE_GST_RATE) || 18,
    hsn: process.env.INVOICE_HSN || '8526',
  },
  // Local dev against the live database: uploaded files live on the live server, not this disk, so
  // /uploads requests that miss locally are redirected here (e.g. https://api.trakwaytechnologies.com).
  uploadsFallbackUrl: (process.env.UPLOADS_FALLBACK_URL || '').trim().replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};
