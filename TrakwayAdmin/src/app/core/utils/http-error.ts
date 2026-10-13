import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/api.model';

// Readable message from any HTTP error (API error body, network failure, etc.).
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Check your connection.';
    const body = err.error as Partial<ApiErrorBody> | null;
    return body?.message || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

// Field-level errors from a 400/409 response, keyed by field name.
export function getFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof HttpErrorResponse) {
    return (err.error as Partial<ApiErrorBody> | null)?.errors ?? {};
  }
  return {};
}
