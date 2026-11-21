export type VendorInvoiceStatus = 'issued' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other';

export interface VendorInvoiceItem {
  id: number;
  product_id: number | null;
  description: string;
  hsn_sac: string | null;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  taxable_value: number;
  tax_amount: number;
  line_total: number;
}

export interface VendorInvoicePayment {
  id: number;
  paid_on: string;
  amount: number;
  method: PaymentMethod;
  method_label: string;
  reference: string | null;
  created_at: string;
}

export interface TaxRateSummary {
  rate: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
}

// List row. bill_* is the vendor as it was when the invoice was last saved.
export interface VendorInvoiceListItem {
  id: number;
  invoice_no: string;
  vendor_id: number;
  invoice_date: string;
  due_date: string | null;
  bill_name: string;
  bill_contact_person: string | null;
  bill_mobile: string;
  bill_email: string | null;
  bill_gstin: string | null;
  bill_address: string;
  bill_city: string;
  bill_state: string;
  bill_pincode: string;
  // Vendor in our state: CGST + SGST, else IGST.
  intra_state: boolean;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  // Grand total is rounded to the nearest rupee; this is the +/- adjustment.
  round_off: number;
  grand_total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  status: VendorInvoiceStatus;
  notes: string | null;
  terms: string | null;
  cancelled_at: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface VendorInvoice extends VendorInvoiceListItem {
  items: VendorInvoiceItem[];
  payments: VendorInvoicePayment[];
  tax_summary: TaxRateSummary[];
}

export interface VendorInvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  vendor_id?: number;
  status?: VendorInvoiceStatus;
  payment_status?: PaymentStatus;
  from?: string;
  to?: string;
}

export interface VendorInvoiceSummary {
  count: number;
  billed: number;
  received: number;
  outstanding: number;
  overdue: number;
}

export interface VendorInvoiceOptions {
  vendors: { id: number; name: string; contact_person: string | null; mobile: string; gstin: string | null; city: string; state: string }[];
  // price: website selling price, GST-inclusive (null when priced per combination).
  products: { id: number; name: string; price: number | null }[];
  seller_state: string;
  gst_rates: number[];
  default_gst_rate: number;
  default_hsn: string;
  default_terms: string;
  payment_methods: { value: PaymentMethod; label: string }[];
}

// POST / PUT send the whole invoice; the API calculates every amount.
export interface VendorInvoiceItemPayload {
  product_id: number | null;
  description: string | null;
  hsn_sac: string | null;
  quantity: number | string;
  unit_price: number | string;
  gst_rate: number;
}

export interface VendorInvoicePayload {
  vendor_id: number;
  invoice_date: string;
  due_date: string | null;
  notes: string | null;
  terms: string | null;
  items: VendorInvoiceItemPayload[];
}

export interface PaymentPayload {
  paid_on: string;
  amount: number | string;
  method: PaymentMethod;
  reference: string | null;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partially paid',
  paid: 'Paid',
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-50 text-red-600',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
};

// Limits from the API's vendor-invoice.validation.js.
export const VENDOR_INVOICE_LIMITS = {
  maxItems: 50,
  maxDescription: 500,
  maxNotes: 1000,
  maxTerms: 2000,
  maxReference: 100,
} as const;
