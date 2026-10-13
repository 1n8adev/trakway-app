// Checks the SMTP settings in .env and optionally sends emails to look at.
// Usage:
//   npm run mail:check                          -> SMTP login only
//   npm run mail:check -- you@example.com       -> + a plain test email
//   npm run mail:check -- you@example.com --templates
//                                               -> + every customer email template with sample data
const { verifyConnection, sendMail } = require('../utils/mailer');
const { otpEmail } = require('../utils/emailTemplates');

const SAMPLES = [
  { label: 'Registration OTP', mail: otpEmail({ name: 'Ravi Kumar', code: '482915', purpose: 'register', minutes: 10 }) },
  { label: 'Forgot password OTP', mail: otpEmail({ name: 'Ravi Kumar', code: '739204', purpose: 'reset_password', minutes: 10 }) },
];

(async () => {
  await verifyConnection();
  console.log('SMTP login OK');
  const [to, flag] = process.argv.slice(2);
  if (!to) return;

  if (flag === '--templates') {
    for (const { label, mail } of SAMPLES) {
      await sendMail({ to, ...mail, subject: `[Preview] ${mail.subject}` });
      console.log(`Sent "${label}" preview to ${to}`);
    }
    return;
  }
  await sendMail({ to, subject: 'Trakway SMTP test', text: 'SMTP is working.', html: '<p>SMTP is working.</p>' });
  console.log(`Test email sent to ${to}`);
})().catch((err) => {
  console.error('SMTP check failed:', err.message);
  process.exitCode = 1;
});
