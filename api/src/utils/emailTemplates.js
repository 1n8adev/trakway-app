// Email bodies. Each returns { subject, html, text }.

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const PURPOSE = {
  register: { subject: 'Verify your Trakway account', intro: 'Use this code to verify your email and finish creating your account.' },
  reset_password: { subject: 'Reset your Trakway password', intro: 'Use this code to reset your password.' },
};

function otpEmail({ name, code, purpose, minutes }) {
  const { subject, intro } = PURPOSE[purpose];
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
  const text = `${name ? `Hi ${name},` : 'Hi,'}\n\n${intro}\n\nYour code: ${code}\n\n`
    + `It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.\n\n— Team Trakway`;
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#f97316;margin:0 0 16px">Trakway</h2>
  <p>${greeting}</p>
  <p>${intro}</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0;color:#111827">${code}</p>
  <p style="color:#6b7280;font-size:14px">This code expires in ${minutes} minutes.
    If you didn't request it, you can ignore this email.</p>
  <p style="color:#6b7280;font-size:14px">— Team Trakway</p>
</div>`;
  return { subject, html, text };
}

const { formatInr } = require('./money');

const itemRowsHtml = (items) => items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
        <div style="font-weight:bold">${escapeHtml(item.product_name)}</div>
        ${item.variant_label ? `<div style="color:#6b7280;font-size:13px">${escapeHtml(item.variant_label)}</div>` : ''}
        <div style="color:#6b7280;font-size:13px">Qty ${item.quantity} × ${formatInr(item.final_price)}</div>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap">${formatInr(item.line_total)}</td>
    </tr>`).join('');

const totalsHtml = (order) => `
    <tr><td style="padding:4px 0;color:#6b7280">Subtotal</td><td style="text-align:right">${formatInr(order.subtotal)}</td></tr>
    ${order.coupon_discount > 0 ? `<tr><td style="padding:4px 0;color:#16a34a">Coupon ${escapeHtml(order.coupon_code)}</td>
      <td style="text-align:right;color:#16a34a">− ${formatInr(order.coupon_discount)}</td></tr>` : ''}
    <tr><td style="padding:4px 0;color:#6b7280">Shipping</td>
      <td style="text-align:right">${order.shipping_fee > 0 ? formatInr(order.shipping_fee) : 'Free'}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #e5e7eb">Total (Cash on Delivery)</td>
      <td style="padding:8px 0;font-weight:bold;border-top:1px solid #e5e7eb;text-align:right">${formatInr(order.total)}</td></tr>`;

// prefix "ship" (delivery) or "bill" (billing) order columns.
const addressHtml = (order, prefix = 'ship') => {
  const f = (key) => order[`${prefix}_${key}`];
  return [
    `<strong>${escapeHtml(f('name'))}</strong>`,
    escapeHtml(f('address_line1')),
    f('address_line2') && escapeHtml(f('address_line2')),
    f('landmark') && `Landmark: ${escapeHtml(f('landmark'))}`,
    `${escapeHtml(f('city'))}, ${escapeHtml(f('state'))} - ${escapeHtml(f('pincode'))}`,
    `Phone: ${escapeHtml(f('phone'))}`,
  ].filter(Boolean).join('<br>');
};

// Billing block: shown when billing differs from delivery or GST details were given.
const billingHtml = (order) => {
  if (order.billing_same_as_shipping && !order.bill_company_name && !order.bill_gstin) return '';
  const gst = [
    order.bill_company_name && `<strong>${escapeHtml(order.bill_company_name)}</strong>`,
    order.bill_gstin && `GSTIN: ${escapeHtml(order.bill_gstin)}`,
  ].filter(Boolean).join('<br>');
  const address = order.billing_same_as_shipping ? 'Same as delivery address' : addressHtml(order, 'bill');
  return `
  <h3 style="margin:24px 0 8px;font-size:15px">Billing details</h3>
  <p style="font-size:14px;line-height:1.5;margin:0">${gst ? `${gst}<br>` : ''}${address}</p>`;
};

const itemsText = (items) => items
  .map((i) => `- ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ''} x${i.quantity}: ${formatInr(i.line_total)}`)
  .join('\n');

// Sent to the customer after placing an order.
function orderPlacedEmail({ order, items, customerName }) {
  const subject = `Order ${order.order_no} placed — Trakway`;
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#f97316;margin:0 0 16px">Trakway</h2>
  <p>Hi ${escapeHtml(customerName)},</p>
  <p>Thank you for your order! We have received it and will contact you shortly to confirm delivery.</p>
  <p style="margin:16px 0"><strong>Order number:</strong> ${order.order_no}<br>
     <strong>Payment:</strong> Cash on Delivery</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${itemRowsHtml(items)}</table>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">${totalsHtml(order)}</table>
  <h3 style="margin:24px 0 8px;font-size:15px">Delivery address</h3>
  <p style="font-size:14px;line-height:1.5;margin:0">${addressHtml(order)}</p>${billingHtml(order)}
  <p style="color:#6b7280;font-size:13px;margin-top:24px">Please keep ${formatInr(order.total)} ready at the time of delivery.</p>
  <p style="color:#6b7280;font-size:13px">— Team Trakway</p>
</div>`;
  const text = `Hi ${customerName},\n\nThank you for your order! Order number: ${order.order_no}\nPayment: Cash on Delivery\n\n`
    + `${itemsText(items)}\n\nTotal: ${formatInr(order.total)}\n\nDelivery to: ${order.ship_name}, ${order.ship_address_line1}, `
    + `${order.ship_city}, ${order.ship_state} - ${order.ship_pincode} (${order.ship_phone})\n\n— Team Trakway`;
  return { subject, html, text };
}

// Sent to ADMIN_ORDER_EMAIL when a new order comes in.
function newOrderAdminEmail({ order, items, customer }) {
  const subject = `New order ${order.order_no} — ${formatInr(order.total)} (COD)`;
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="margin:0 0 16px">New order ${order.order_no}</h2>
  <p><strong>Customer:</strong> ${escapeHtml(customer.name)} (${escapeHtml(customer.email)})</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${itemRowsHtml(items)}</table>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">${totalsHtml(order)}</table>
  <h3 style="margin:24px 0 8px;font-size:15px">Deliver to</h3>
  <p style="font-size:14px;line-height:1.5;margin:0">${addressHtml(order)}</p>${billingHtml(order)}
  ${order.customer_note ? `<p><strong>Customer note:</strong> ${escapeHtml(order.customer_note)}</p>` : ''}
</div>`;
  const text = `New order ${order.order_no} from ${customer.name} (${customer.email})\n\n${itemsText(items)}\n\n`
    + `Total: ${formatInr(order.total)} (COD)\nDeliver to: ${order.ship_name}, ${order.ship_phone}, ${order.ship_city} ${order.ship_pincode}`;
  return { subject, html, text };
}

module.exports = { otpEmail, orderPlacedEmail, newOrderAdminEmail };
