export interface Category {
  id: number;
  parent_id: number | null;
  parent_name: string | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  children_count?: number;
  created_at: string;
  updated_at: string;
}

// Flat row from GET /admin/categories/tree, used for the parent dropdown.
export interface CategoryOption {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  children?: CategoryOption[];
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  parent_id: number | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  // Existing image path; send null to remove it. A new file is sent separately.
  image?: string | null;
}

export interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  parent_id?: number | 'root';
  status?: 'active' | 'inactive';
}
