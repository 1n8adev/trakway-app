export type VendorInvoiceStatus = 'issued' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other';

export interface VendorInvoiceItem {
  id: number;
  // At most one is set; neither = custom line.
  product_id: number | null;
  // The combination sold on a product line (e.g. "1 Year"), when the product has combinations.
  variant_id: number | null;
  variant_label: string | null;
  accessory_id: number | null;
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

// /api/admin/vendor-invoice-types — Sales Invoice (TWV), Renewal Invoice (TWR), ...
// Each type numbers its invoices "<prefix>/<FY>/0001"; name is the PDF title.
export interface VendorInvoiceType {
  id: number;
  name: string;
  prefix: string;
  is_active: boolean;
  sort_order: number;
  // The prefix is locked and the type can't be deleted once this is > 0.
  invoice_count: number;
  created_at: string;
  updated_at: string;
}

export interface VendorInvoiceTypePayload {
  name?: string;
  prefix?: string;
  is_active?: boolean;
}

// Limits from the API's vendor-invoice-type.validation.js.
export const INVOICE_TYPE_LIMITS = { maxName: 60, prefixPattern: /^[A-Z0-9-]{1,10}$/ } as const;

// List row. bill_* is the vendor as it was when the invoice was last saved.
export interface VendorInvoiceListItem {
  id: number;
  invoice_no: string;
  type_id: number;
  type_name: string;
  type_prefix: string;
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
  type_id?: number;
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

export interface VendorInvoiceOptionVariant {
  id: number;
  label: string;
  sku: string | null;
  price: number;
}

export interface VendorInvoiceOptionProduct {
  id: number;
  name: string;
  price: number | null;
  stock: number;
  variants: VendorInvoiceOptionVariant[];
}

export interface VendorInvoiceOptions {
  // Active invoice types, in their display order.
  types: { id: number; name: string; prefix: string }[];
  vendors: { id: number; name: string; contact_person: string | null; mobile: string; gstin: string | null; city: string; state: string }[];
  // price: website selling price, GST-inclusive (null when priced per combination).
  // variants: active combinations (price GST-inclusive) — a product with any needs one picked on its line.
  // stock: available units (purchased − invoiced − ordered), shared by all combinations; a warning only.
  products: VendorInvoiceOptionProduct[];
  // Active accessories; price is the rate before GST.
  accessories: { id: number; name: string; price: number; hsn_code: string; gst_rate: number; stock: number }[];
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
  variant_id: number | null;
  accessory_id: number | null;
  description: string | null;
  hsn_sac: string | null;
  quantity: number | string;
  unit_price: number | string;
  gst_rate: number;
}

export interface VendorInvoicePayload {
  // Required on create; fixed afterwards (the API ignores it on update).
  type_id?: number;
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
