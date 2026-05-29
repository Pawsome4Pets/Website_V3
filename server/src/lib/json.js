// Helpers to (de)serialize JSON columns stored as TEXT in SQLite.
// Keeps the API contract consistent with the original Json-typed schema.

export function encodeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value; // already encoded
  try { return JSON.stringify(value); } catch { return null; }
}

export function decodeJson(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return raw; }
}

// Convert a field record from the DB shape (options/validation as strings) to the
// API shape (parsed objects).
export function decodeField(f) {
  return { ...f, options: decodeJson(f.options), validation: decodeJson(f.validation) };
}
