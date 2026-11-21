export interface Vendor {
  id: number;
  name: string;
  contact_person: string | null;
  mobile: string;
  email: string | null;
  gstin: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  // Internal, never printed on invoices.
  notes: string | null;
  is_active: boolean;
  // Issued invoices only (list only, not GET /:id).
  invoice_count?: number;
  total_billed?: number;
  balance_due?: number;
  created_at: string;
  updated_at: string;
}

export interface VendorFilters {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  status?: 'active' | 'inactive';
}

// "" / null clears an optional field on update.
export interface VendorPayload {
  name?: string;
  contact_person?: string | null;
  mobile?: string;
  email?: string | null;
  gstin?: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string | null;
  is_active?: boolean;
}

// Limits from the API's vendor.validation.js.
export const VENDOR_LIMITS = {
  maxName: 150,
  maxContact: 100,
  maxEmail: 255,
  maxAddress: 500,
  maxCity: 60,
  maxNotes: 1000,
} as const;

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
