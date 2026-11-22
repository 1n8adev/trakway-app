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
  // Supplier products mapped to this accessory.
  supplier_product_count: number;
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
  // The full set of supplier products mapped to it (omit to leave the mapping unchanged).
  supplier_product_ids?: number[];
}

// GET /product-accessories/supplier-products — every supplier product with its current mapping.
export interface MappableSupplierProduct {
  id: number;
  name: string;
  price: number;
  is_active: boolean;
  supplier_id: number;
  supplier_name: string;
  supplier_is_active: boolean;
  accessory_id: number | null;
  accessory_name: string | null;
  // Or mapped to a Trakway product (stock is per product; combinations share it).
  product_id: number | null;
  product_name: string | null;
}

// "accessory Relay" / "product Trakway 4G GPS", or null when not mapped.
export function mappedToLabel(sp: Pick<MappableSupplierProduct, 'accessory_id' | 'accessory_name' | 'product_id' | 'product_name'>): string | null {
  if (sp.accessory_id) return `accessory ${sp.accessory_name}`;
  if (sp.product_id) return `product ${sp.product_name}`;
  return null;
}

// GET /products/:id/suppliers — the product "Suppliers" tab.
export interface ProductSuppliers {
  // Every supplier product with its current mapping; product_id = this product means mapped here.
  supplier_products: (MappableSupplierProduct & { hsn_code: string; gst_rate: number })[];
}

// Same rules as the API's product-accessory.validation.js.
export const ACCESSORY_LIMITS = { maxName: 150 } as const;
export const GST_RATES = [0, 5, 12, 18, 28] as const;
