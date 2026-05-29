// URL-safe slug from arbitrary input. Strips diacritics, collapses to dashes.
export function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `form-${Date.now()}`;
}
