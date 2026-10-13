// Product attributes (e.g. "SIM") and their selectable values (e.g. "Airtel Sim").
export interface AttributeValue {
  id: number;
  value: string;
  sort_order: number;
  is_active: boolean;
}

export interface Attribute {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  values: AttributeValue[];
}

export interface AttributeFilters {
  search?: string;
  status?: 'active' | 'inactive';
}

// POST /attributes. `values` creates the first values in the given order.
export interface AttributeCreatePayload {
  name: string;
  values?: string[];
  sort_order?: number;
  is_active?: boolean;
}

// PUT /attributes/:id. Values are managed through the /values endpoints instead.
export interface AttributeUpdatePayload {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface AttributeValuePayload {
  value?: string;
  sort_order?: number;
  is_active?: boolean;
}
