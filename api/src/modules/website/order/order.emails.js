// Order confirmation emails, sent once an order is placed (COD) or paid (Razorpay).
const env = require('../../../config/env');
const { sendMail } = require('../../../utils/mailer');
const { orderPlacedEmail, newOrderAdminEmail } = require('../../../utils/emailTemplates');

// Sends the confirmation (and admin copy) without making the customer wait or failing the order.
function sendOrderEmails(order, items, customer) {
  const jobs = [sendMail({ to: customer.email, ...orderPlacedEmail({ order, items, customerName: customer.name }) })];
  if (env.adminOrderEmails.length) {
    jobs.push(sendMail({ to: env.adminOrderEmails.join(','), ...newOrderAdminEmail({ order, items, customer }) }));
  }
  Promise.allSettled(jobs).then((results) => results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.error(`Order ${order.order_no} email failed:`, r.reason?.message)));
}

module.exports = { sendOrderEmails };
