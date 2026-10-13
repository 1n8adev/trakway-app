// Response envelopes returned by TrakwayAPI (see utils/response.js on the API).
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string>;
}
