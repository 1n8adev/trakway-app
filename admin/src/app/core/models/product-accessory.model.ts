// /api/admin/product-accessories — accessories master, picked as vendor invoice lines.
export interface ProductAccessory {
  id: number;
  name: string;
  // Rate before GST (same as an invoice line's rate).
  price: number;
  hsn_code: string;
  gst_rate: number;
  is_active: boolean;
  // Invoices that use it; it can't be deleted while > 0.
  invoice_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductAccessoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface ProductAccessoryPayload {
  name?: string;
  price?: number | string;
  hsn_code?: string;
  gst_rate?: number;
  is_active?: boolean;
}

// Same rules as the API's product-accessory.validation.js.
export const ACCESSORY_LIMITS = { maxName: 150 } as const;
export const GST_RATES = [0, 5, 12, 18, 28] as const;
