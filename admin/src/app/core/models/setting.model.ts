// GET / PUT /api/admin/settings/invoice
export interface InvoiceSettings {
  // Default terms for new vendor invoices, one point per line (the PDF numbers them).
  vendor_terms: string;
  // true while nothing has been saved, i.e. the built-in terms are in use.
  vendor_terms_is_default: boolean;
  builtin_vendor_terms: string;
  updated_at: string | null;
  updated_by_name: string | null;
}

// Same limit as an invoice's own terms.
export const MAX_VENDOR_TERMS = 2000;
