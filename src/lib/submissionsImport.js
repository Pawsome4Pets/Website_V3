// Parse legacy submission data from an Excel file (.xlsx) OR a JSON entries
// export into a uniform shape the import page can preview and submit.
//
// Output shape (same regardless of source file type):
//   {
//     columns:    ['Owner Name', 'Email', 'Notes', ...],  // raw column labels
//     rows:       [{ 'Owner Name': 'Alice', Email: 'a@x' }, ...],
//     ignoredMetaColumns: ['Entry Id', 'Date Submitted', ...],
//     sourceLabel: 'old-clients.xlsx (Sheet1, 142 rows)',
//   }
//
// The downstream import page is responsible for mapping `columns` onto the
// target form's field keys (by case-insensitive label match) and POSTing the
// remapped rows to /admin/forms/:id/submissions/bulk.

import * as XLSX from 'xlsx';

// Cognito Forms-specific columns that are automatic metadata, not real fields.
const META_COLUMNS = new Set([
  'entry', 'entry id', 'entry number', 'id', 'submission id',
  'date submitted', 'date created', 'date updated', 'date', 'time',
  'status', 'role', 'assigned to', 'entry origin', 'origin',
  'entry ip', 'ip address', 'ip', 'user agent',
]);

function isMetaColumn(label) {
  const norm = String(label || '').trim().toLowerCase();
  if (!norm) return true;
  return META_COLUMNS.has(norm);
}

// ─── Excel (.xlsx, .xls, .csv) ──────────────────────────────────────────────
export function parseExcelSubmissions(buffer, opts = {}) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch (err) {
    throw new Error(`Could not read Excel file: ${err.message}`);
  }
  if (!workbook.SheetNames.length) throw new Error('The workbook has no sheets.');

  // Use the first non-empty sheet.
  let sheetName = workbook.SheetNames[0];
  let raw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1, defval: '', blankrows: false, raw: false,
  });
  if (raw.length < 2) {
    for (const name of workbook.SheetNames) {
      const r = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1, defval: '', blankrows: false, raw: false,
      });
      if (r.length >= 2) { sheetName = name; raw = r; break; }
    }
  }
  if (raw.length === 0) throw new Error('No rows found in the file.');

  const [headerRow, ...dataRows] = raw;
  if (!headerRow.some((c) => String(c || '').trim().length > 0)) {
    throw new Error('First row of the sheet is empty — expected column headers.');
  }

  const columns = [];
  const ignoredMetaColumns = [];
  const colIndex = []; // index into the raw row for each kept column
  for (let i = 0; i < headerRow.length; i++) {
    const label = String(headerRow[i] || '').trim();
    if (!label) continue;
    if (isMetaColumn(label)) { ignoredMetaColumns.push(label); continue; }
    columns.push(label);
    colIndex.push(i);
  }

  const rows = dataRows
    .filter((r) => r.some((c) => String(c ?? '').trim().length > 0))
    .map((r) => {
      const obj = {};
      for (let i = 0; i < columns.length; i++) {
        const raw = r[colIndex[i]];
        if (raw === undefined || raw === null || raw === '') continue;
        if (raw instanceof Date) obj[columns[i]] = raw.toISOString().slice(0, 10);
        else obj[columns[i]] = String(raw);
      }
      return obj;
    });

  return {
    columns,
    rows,
    ignoredMetaColumns,
    sourceLabel: `${opts.fileName || 'workbook'} (${sheetName}, ${rows.length} row${rows.length === 1 ? '' : 's'})`,
  };
}

// ─── JSON entries export ────────────────────────────────────────────────────
// Designed for Cognito Forms' full "Entries → Export → JSON" download.
//
// Cognito's shape (simplified):
//   [
//     {
//       "Id": 1, "Number": 1, "DateCreated": "...", "DateSubmitted": "...",
//       "Status": "Submitted", "Entry": { "AdminLink": "...", ... },   ← meta, dropped
//
//       // Real form fields at top level:
//       "OwnerName":  { "First": "Alice", "Last": "Smith" },           ← flatten → 2 cols
//       "Address":    { "Line1": "...", "City": "...", "PostalCode": "..." }, ← flatten
//       "Phone":      "+27 …",                                          ← scalar
//       "Owners":     [ { ... }, { ... } ],                             ← repeater, KEEP
//       "Dogs":       [ { "Name": "Rex", "Breed": "..." }, ... ],       ← repeater, KEEP
//       "DocsUpload": [ { "File": "...url...", ... } ]                  ← keep as JSON
//     },
//     ...
//   ]
//
// Output:
//   columns: ['Owner First Name', 'Owner Last Name', 'Phone', 'Owners', 'Dogs', ...]
//   rows:    [ { 'Owner First Name': 'Alice', 'Owners': [...], 'Dogs': [...] }, ... ]
//
// Repeater values stay as arrays so the admin import page can pass them through
// to our `repeater` field type without losing structure. Scalar columns stay as
// strings.

// Cognito sub-object shapes we know how to split nicely. If the value matches
// one of these schemas exactly we'll flatten it; otherwise we fall back to a
// generic "Parent Sub" flatten.
const KNOWN_SUBSHAPES = [
  { type: 'name', keys: ['First', 'Last', 'Middle', 'Prefix', 'Suffix'] },
  { type: 'address', keys: ['Line1', 'Line2', 'City', 'State', 'PostalCode', 'Country'] },
];

function classifySubshape(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const ks = Object.keys(obj);
  for (const shape of KNOWN_SUBSHAPES) {
    if (ks.every((k) => shape.keys.includes(k))) return shape.type;
  }
  return null;
}

// Cognito wraps each entry's metadata in an "Entry" sub-object. Some exports
// also put the form fields under a "Name" or top-level key. We unwrap.
function unwrapEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  // Drop the "Entry" meta sub-object outright — we never want fields from it.
  if (entry.Entry && typeof entry.Entry === 'object') {
    const { Entry, ...rest } = entry;
    return rest;
  }
  return entry;
}

function flattenOneEntry(entry) {
  const flat = {};
  const e = unwrapEntry(entry);
  for (const [k, v] of Object.entries(e || {})) {
    if (v == null || v === '') continue;
    if (isMetaColumn(k)) continue;

    // Scalar
    if (typeof v !== 'object') {
      flat[k] = String(v);
      continue;
    }

    // Array — preserved as-is so repeaters round-trip. The import page passes
    // these through to the matching field; the bulk-submission endpoint stores
    // them as a JSON-stringified value, which our `repeater` field decodes.
    if (Array.isArray(v)) {
      flat[k] = v.map(stripNested);
      continue;
    }

    // Object → try a smart flatten
    const shape = classifySubshape(v);
    if (shape === 'name') {
      // OwnerName: { First, Last, Middle } → "Owner First Name", "Owner Last Name"
      const niceParent = k.replace(/Name$/i, '').trim() || k;
      if (v.First) flat[`${niceParent} First Name`] = String(v.First);
      if (v.Middle) flat[`${niceParent} Middle Name`] = String(v.Middle);
      if (v.Last) flat[`${niceParent} Last Name`] = String(v.Last);
      if (v.Prefix) flat[`${niceParent} Prefix`] = String(v.Prefix);
      if (v.Suffix) flat[`${niceParent} Suffix`] = String(v.Suffix);
    } else if (shape === 'address') {
      if (v.Line1) flat[`${k} Line 1`] = String(v.Line1);
      if (v.Line2) flat[`${k} Line 2`] = String(v.Line2);
      if (v.City) flat[`${k} City`] = String(v.City);
      if (v.State) flat[`${k} State`] = String(v.State);
      if (v.PostalCode) flat[`${k} Postal Code`] = String(v.PostalCode);
      if (v.Country) flat[`${k} Country`] = String(v.Country);
    } else {
      // Generic one-level flatten: { Parent: { A, B } } → "Parent A", "Parent B"
      for (const [kk, vv] of Object.entries(v)) {
        if (vv == null || vv === '') continue;
        if (typeof vv === 'object') flat[`${k} ${kk}`] = JSON.stringify(vv);
        else flat[`${k} ${kk}`] = String(vv);
      }
    }
  }
  return flat;
}

// Strip the inner "Entry" meta wrapper from each repeater row, so what gets
// stored as the repeater value is just the user-visible fields.
function stripNested(x) {
  if (x == null) return x;
  if (typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map(stripNested);
  const out = {};
  for (const [k, v] of Object.entries(x)) {
    if (isMetaColumn(k)) continue;
    if (v == null || v === '') continue;
    if (typeof v === 'object' && !Array.isArray(v) && classifySubshape(v) === 'name') {
      const parts = [v.First, v.Middle, v.Last].filter(Boolean).join(' ');
      if (parts) out[k] = parts;
    } else if (typeof v === 'object') {
      out[k] = stripNested(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function parseJsonSubmissions(input, opts = {}) {
  let data;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Paste or upload a JSON file.');
    try { data = JSON.parse(trimmed); }
    catch (err) { throw new Error(`Invalid JSON: ${err.message}`); }
  } else if (input && typeof input === 'object') {
    data = input;
  } else {
    throw new Error('No data to import.');
  }

  // Unwrap common container envelopes
  if (!Array.isArray(data)) {
    if (Array.isArray(data.Entries)) data = data.Entries;
    else if (Array.isArray(data.entries)) data = data.entries;
    else if (Array.isArray(data.items)) data = data.items;
    else if (Array.isArray(data.Items)) data = data.Items;
    else if (Array.isArray(data.rows)) data = data.rows;
    else throw new Error('Expected a JSON array of entries, or { entries: [...] }.');
  }

  if (data.length === 0) {
    return {
      columns: [], rows: [], ignoredMetaColumns: [],
      sourceLabel: `${opts.fileName || 'entries.json'} (0 rows)`,
    };
  }

  const flatRows = data.map(flattenOneEntry);

  // Build column list from the union of keys (preserving first-seen order)
  // and track meta columns we dropped so the user knows what was skipped.
  const seen = new Set();
  const columns = [];
  const ignoredMetaColumns = [];
  const originalKeys = new Set();
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    for (const k of Object.keys(unwrapEntry(row))) originalKeys.add(k);
  }
  for (const k of originalKeys) {
    if (isMetaColumn(k)) ignoredMetaColumns.push(k);
  }
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }

  const rows = flatRows.map((r) => {
    const out = {};
    for (const c of columns) if (r[c] !== undefined) out[c] = r[c];
    return out;
  });

  return {
    columns,
    rows,
    ignoredMetaColumns,
    sourceLabel: `${opts.fileName || 'entries.json'} (${rows.length} row${rows.length === 1 ? '' : 's'})`,
  };
}

// ─── Mapping helpers ─────────────────────────────────────────────────────────
// Given the file's column labels and the form's fields, produce a default map:
//   { [columnLabel]: fieldKey | null }
// Match attempts, in order:
//   1. exact fieldKey match (case-sensitive)
//   2. fieldKey case-insensitive
//   3. label case-insensitive trimmed
//   4. fuzzy alphanumeric only (handles spaces, punctuation)
//   5. fuzzy + singularised (handles Cognito plural like "Owners" → "Owner")

function singularise(s) {
  // Naive but sufficient for our forms.
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('ses')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
  return s;
}

function fuzzy(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function autoMapColumns(columns, formFields) {
  const indexes = {
    keyExact: new Map(),
    keyLower: new Map(),
    labelLower: new Map(),
    fuzzy: new Map(),
    fuzzySingular: new Map(),
  };
  for (const f of formFields) {
    const key = String(f.fieldKey || '');
    const label = String(f.label || '');
    indexes.keyExact.set(key, f);
    indexes.keyLower.set(key.toLowerCase(), f);
    indexes.labelLower.set(label.trim().toLowerCase(), f);
    indexes.fuzzy.set(fuzzy(label), f);
    indexes.fuzzy.set(fuzzy(key), f);
    indexes.fuzzySingular.set(singularise(fuzzy(label)), f);
    indexes.fuzzySingular.set(singularise(fuzzy(key)), f);
  }

  const mapping = {};
  for (const col of columns) {
    const t = String(col || '').trim();
    const lo = t.toLowerCase();
    const fz = fuzzy(t);
    const fzs = singularise(fz);
    const match = indexes.keyExact.get(t)
      || indexes.keyLower.get(lo)
      || indexes.labelLower.get(lo)
      || indexes.fuzzy.get(fz)
      || indexes.fuzzy.get(fzs)
      || indexes.fuzzySingular.get(fz)
      || indexes.fuzzySingular.get(fzs);
    mapping[col] = match ? match.fieldKey : null;
  }
  return mapping;
}

// Translate `rows` (keyed by column label) into rows keyed by fieldKey using
// the mapping. Drops columns mapped to null. Arrays/objects (repeater data,
// nested structures) are JSON-stringified so the bulk-submission endpoint can
// store them — they're decoded back to objects when the submission is viewed.
export function remapRows(rows, mapping) {
  return rows.map((row) => {
    const out = {};
    for (const [col, value] of Object.entries(row)) {
      const fieldKey = mapping[col];
      if (!fieldKey) continue;
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'object') {
        // Empty array / empty object → skip
        const empty = Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0;
        if (empty) continue;
        out[fieldKey] = JSON.stringify(value);
      } else {
        out[fieldKey] = String(value);
      }
    }
    return out;
  });
}
