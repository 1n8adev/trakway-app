const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

// Sends an email. Without SMTP_HOST: printed to the console in development, an error in production.
async function sendMail({ to, subject, html, text }) {
  if (!env.smtp.host) {
    if (env.nodeEnv === 'production') throw new Error('SMTP is not configured (SMTP_HOST is empty)');
    console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n[mail:dev] ${text}\n`);
    return;
  }
  await getTransporter().sendMail({ from: env.mailFrom, to, subject, html, text });
}

// Checks the SMTP login (used by `npm run mail:check`).
async function verifyConnection() {
  if (!env.smtp.host) throw new Error('SMTP_HOST is empty');
  await getTransporter().verify();
}

module.exports = { sendMail, verifyConnection };
