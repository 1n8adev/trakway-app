import { environment } from '../../../environments/environment';

// Turns an API path like /uploads/categories/x.jpg into a full URL; absolute URLs pass through.
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${environment.assetUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
