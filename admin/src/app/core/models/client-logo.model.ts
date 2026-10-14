export interface ClientLogo {
  id: number;
  name: string;
  image: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientLogoPayload {
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface ClientLogoFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}
