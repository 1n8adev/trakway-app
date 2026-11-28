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
  // Cash on Delivery on the website. Off unless COD_ENABLED=true (online payment only).
  codEnabled: (process.env.COD_ENABLED || 'false').toLowerCase() === 'true',
  // Razorpay online payments. Needs RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.
  // RAZORPAY_WEBHOOK_SECRET is the secret set on the webhook in the Razorpay dashboard.
  // Unpaid online orders are cancelled after RAZORPAY_PENDING_MINUTES.
  razorpay: {
    keyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
    keySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
    webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),
    pendingMinutes: Number(process.env.RAZORPAY_PENDING_MINUTES) || 30,
    businessName: process.env.RAZORPAY_BUSINESS_NAME || 'Trakway',
  },
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
    // Vendor invoices (admin > Vendor Invoices): bank details and default terms. Number prefixes are per invoice type (DB).
    // Bank fields left empty are not printed; the bank box is skipped when all are empty.
    // INVOICE_VENDOR_TERMS uses "|" between lines.
    bank: {
      bankName: (process.env.INVOICE_BANK_NAME || '').trim(),
      accountName: (process.env.INVOICE_BANK_ACCOUNT_NAME || '').trim(),
      accountNo: (process.env.INVOICE_BANK_ACCOUNT_NO || '').trim(),
      ifsc: (process.env.INVOICE_BANK_IFSC || '').trim().toUpperCase(),
      branch: (process.env.INVOICE_BANK_BRANCH || '').trim(),
      accountType: (process.env.INVOICE_BANK_ACCOUNT_TYPE || '').trim(),
    },
    // One point per line; the PDF numbers them. Keep under 2000 characters (the invoice terms limit).
    vendorTerms: (process.env.INVOICE_VENDOR_TERMS || [
      'Create an online account on the Trakway tracking platform by providing all relevant information.',
      'Agree to the Terms of Service and Privacy Policy at https://www.trakwaytechnologies.com/privacy-policy.',
      'Delivery within 5 working days after receipt of Purchase Order & payment confirmation.',
      'SMS delay or non-delivery of message(s) depends on the connectivity of the network.',
      'Playback and Reports will be provided for 90 days and One Year respectively.',
      'Enhancements or modifications in features/functionalities can be taken up at an extra cost based on the nature of the request.',
      '100% payment in advance.',
      'One year warranty for any manufacturing defects from the date of supply / invoice / installation of the GPS device, whichever is earlier. (For faults other than manufacturing defects, the repair & re-installation cost will be borne by the user.)',
      'Taxes are applicable as per standards.',
      '99.9% server availability during business hours. 99.5% server availability during non-business hours.',
      'From the second year, data charges will be billed per device per annum as per the chosen plan, excluding taxes, subject to change with prior notice.',
      'Payments to be made in favour of "TRAKWAY TECHNOLOGIES".',
      'Any changes in our invoices w.r.t. your Company Name or GST details will be accepted only within 10 days of the invoice date.',
      'Subject to Tirupur jurisdiction.',
    ].join('|'))
      .split('|')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n'),
  },
  // Local dev against the live database: uploaded files live on the live server, not this disk, so
  // /uploads requests that miss locally are redirected here (e.g. https://api.trakwaytechnologies.com).
  uploadsFallbackUrl: (process.env.UPLOADS_FALLBACK_URL || '').trim().replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};
