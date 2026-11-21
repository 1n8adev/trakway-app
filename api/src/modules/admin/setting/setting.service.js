// Business logic for admin-editable settings. Each setting falls back to its built-in default
// (config/env.js) until an admin saves a value.
const env = require('../../../config/env');
const settingRepository = require('./setting.repository');

const VENDOR_TERMS = 'invoice.vendor_terms';

// One point per line, blank lines dropped.
const cleanLines = (text) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join('\n');

// Default terms for new vendor invoices (and for invoices saved without terms).
async function vendorTerms() {
  const saved = await settingRepository.findValue(VENDOR_TERMS);
  return saved || env.invoice.vendorTerms;
}

async function getInvoiceSettings() {
  const rows = await settingRepository.findMany([VENDOR_TERMS]);
  const saved = rows[VENDOR_TERMS];
  return {
    vendor_terms: saved?.value || env.invoice.vendorTerms,
    vendor_terms_is_default: !saved?.value,
    builtin_vendor_terms: env.invoice.vendorTerms,
    updated_at: saved?.updated_at ?? null,
    updated_by_name: saved?.updated_by_name ?? null,
  };
}

// vendor_terms: text, or null / "" to go back to the built-in default.
async function updateInvoiceSettings({ vendor_terms: terms }, adminId) {
  const value = terms ? cleanLines(terms) : '';
  if (!value || value === env.invoice.vendorTerms) await settingRepository.remove(VENDOR_TERMS);
  else await settingRepository.upsert(VENDOR_TERMS, value, adminId ?? null);
  return getInvoiceSettings();
}

module.exports = { vendorTerms, getInvoiceSettings, updateInvoiceSettings };
