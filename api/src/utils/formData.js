// multipart/form-data sends every field as a string. These helpers convert them back
// to real types so validators see the same values as a JSON request. Unparseable
// values are left as-is so the validator reports them.

// "" / "null" -> null, numeric string -> integer
function toIntOrNull(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null') return null;
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : value;
}

// numeric string -> integer
function toInt(value) {
  if (typeof value !== 'string') return value;
  return /^-?\d+$/.test(value.trim()) ? Number(value.trim()) : value;
}

// "true"/"1" -> true, "false"/"0" -> false
function toBool(value) {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return value;
}

// "" / "null" -> null
function toStringOrNull(value) {
  if (typeof value !== 'string') return value;
  return value.trim() === '' || value.trim() === 'null' ? null : value;
}

// Accepts an array, a JSON array string ('["a","b"]') or a comma-separated string ("a, b") -> array.
function toList(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return [];
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

// Parses a JSON string ('[...]' or '{...}'); anything else is returned unchanged.
function parseJson(value) {
  if (typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

module.exports = { toIntOrNull, toInt, toBool, toStringOrNull, toList, parseJson };
