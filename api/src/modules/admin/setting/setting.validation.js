// Request validators for admin settings, used with middlewares/validate.

// Same limit as an invoice's own terms (vendor-invoice.validation.js).
const MAX_TERMS = 2000;

// PUT /settings/invoice — { vendor_terms: string | null }
function invoice(body) {
  const errors = {};
  const terms = body.vendor_terms;
  if (terms === undefined) errors.vendor_terms = 'vendor_terms is required (null resets to the default)';
  else if (terms !== null && typeof terms !== 'string') errors.vendor_terms = 'Terms must be text';
  else if (typeof terms === 'string' && terms.trim().length > MAX_TERMS) {
    errors.vendor_terms = `Terms must be at most ${MAX_TERMS} characters`;
  }
  return errors;
}

module.exports = { MAX_TERMS, invoice };
