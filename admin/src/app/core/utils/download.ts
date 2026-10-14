import { HttpErrorResponse } from '@angular/common/http';
import { getErrorMessage } from './http-error';

// File name from a Content-Disposition header ('attachment; filename="Invoice-1.pdf"'), or the fallback.
export function fileNameFrom(contentDisposition: string | null, fallback: string): string {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition ?? '');
  return match ? decodeURIComponent(match[1]) : fallback;
}

// Saves a Blob through a temporary <a download> link.
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// With responseType 'blob', API error bodies arrive as a Blob; read the JSON message out of it.
export async function blobErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
    try {
      const body = JSON.parse(await err.error.text());
      if (body?.message) return body.message;
    } catch {
      // not JSON — fall through
    }
  }
  return getErrorMessage(err, fallback);
}
