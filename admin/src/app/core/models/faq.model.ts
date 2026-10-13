export interface Faq {
  id: number;
  question: string;
  // Editor HTML, cleaned by the API.
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaqFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface FaqPayload {
  question?: string;
  answer?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Limits from the API's faq.validation.js.
export const FAQ_LIMITS = {
  maxQuestion: 500,
  maxAnswer: 20000,
  // The API's page size cap (utils/pagination.js MAX_LIMIT).
  maxPageSize: 100,
} as const;
