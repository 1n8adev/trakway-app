// /api/admin/purchases — supplier bills entered by Trakway. Prices are before GST; the API calculates amounts.
import { PaymentMethod, PaymentStatus } from './vendor-invoice.model';

// Money Trakway sent the supplier against a bill (/api/admin/purchases/:id/payments).
export interface PurchasePayment {
  id: number;
  purchase_id: number;
  paid_on: string;
  amount: number;
  method: PaymentMethod;
  method_label: string;
  reference: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface PurchasePaymentPayload {
  paid_on: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  notes: string | null;
}
export interface PurchaseItem {
  id: number;
  supplier_product_id: number;
  // Copies of the supplier product at the time of the purchase.
  name: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  taxable_value: number;
  tax_amount: number;
  line_total: number;
}

export interface Purchase {
  id: number;
  // "PUR-000012"
  purchase_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_gstin: string | null;
  supplier_state: string;
  bill_no: string;
  bill_date: string;
  // The uploaded bill is private: fetch bill_file_url with the admin token (PurchaseService.bill).
  has_bill_file: boolean;
  bill_file_url: string | null;
  bill_file_name: string | null;
  // Supplier in our state → CGST + SGST, else IGST.
  intra_state: boolean;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  // Payments to the supplier against this bill.
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  // List rows only.
  item_count?: number;
  total_quantity?: number;
  // GET /:id only.
  items?: PurchaseItem[];
  payments?: PurchasePayment[];
}

export interface PurchaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  from?: string;
  to?: string;
  payment_status?: PaymentStatus;
}

export interface PurchaseOptionSupplier {
  id: number;
  name: string;
  gstin: string | null;
  state: string;
}

export interface PurchaseOptionProduct {
  id: number;
  supplier_id: number;
  name: string;
  price: number;
  hsn_code: string;
  gst_rate: number;
}

export interface PurchaseOptions {
  suppliers: PurchaseOptionSupplier[];
  products: PurchaseOptionProduct[];
  seller_state: string;
}

export interface PurchasePayloadItem {
  supplier_product_id: number;
  quantity: number;
  unit_price: number;
}

// Sent as multipart/form-data (items as JSON) so the bill file can go with it.
export interface PurchasePayload {
  supplier_id?: number; // create only
  bill_no: string;
  bill_date: string;
  notes: string | null;
  items: PurchasePayloadItem[];
  bill_file?: File | null;
  remove_bill_file?: boolean;
}

// Same limits as the API's purchase.validation.js / upload middleware.
export const PURCHASE_LIMITS = { maxBillNo: 50, maxNotes: 1000, maxItems: 100, maxFileMb: 10, maxReference: 100, maxPaymentNotes: 1000 } as const;
export const BILL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
