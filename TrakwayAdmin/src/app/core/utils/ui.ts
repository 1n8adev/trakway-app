// Shared Tailwind class strings for form controls (Tailwind scans .ts files, so these get generated).

// Base look of a text input / select / textarea; combine with fieldState().
export const FIELD_BASE =
  'w-full rounded-md border bg-white text-[15px] text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-2';

// Border + focus ring for a valid or invalid field.
export function fieldState(invalid: boolean): string {
  return invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
    : 'border-gray-300 focus:border-brand-600 focus:ring-brand-600/15';
}

// Readable file size, e.g. "1.4 MB".
export function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
