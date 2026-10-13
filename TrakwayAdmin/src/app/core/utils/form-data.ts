// Builds multipart/form-data from a plain object. null becomes "" (the API reads it as null);
// undefined keys are skipped. Files are appended under their own key.
export function toFormData(data: object, files: Record<string, File | null | undefined> = {}): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    form.append(key, value === null ? '' : String(value));
  }
  for (const [key, file] of Object.entries(files)) {
    if (file) form.append(key, file);
  }
  return form;
}
