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
// Accepts:
//   • Bare array of objects:        [ { Name: '...', Email: '...' }, ... ]
//   • Wrapped:                       { Entries: [...] } or { items: [...] }
//   • Cognito-style nested entries:  [ { Entry: { Name: '...' }, ... }, ... ]
//
// Returns the same { columns, rows, ignoredMetaColumns, sourceLabel } shape.
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

  // Unwrap common containers
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

  // Flatten Cognito-style { Entry: { ... } } wrappers and squash one level of
  // nested objects (rare but harmless).
  const flatRows = data.map((entry) => {
    if (entry && typeof entry === 'object' && entry.Entry && typeof entry.Entry === 'object') {
      entry = { ...entry.Entry, ...entry };
      delete entry.Entry;
    }
    const flat = {};
    for (const [k, v] of Object.entries(entry || {})) {
      if (v == null) continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        // One-level flatten: { Address: { Street, City } } → "Address Street", "Address City"
        for (const [kk, vv] of Object.entries(v)) {
          if (vv == null || vv === '') continue;
          flat[`${k} ${kk}`] = String(vv);
        }
      } else if (Array.isArray(v)) {
        flat[k] = v.map((x) => (x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
      } else {
        flat[k] = String(v);
      }
    }
    return flat;
  });

  // Build column list from the union of keys, preserving first-seen order, with
  // meta columns separated out.
  const seen = new Set();
  const columns = [];
  const ignoredMetaColumns = [];
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      if (isMetaColumn(key)) ignoredMetaColumns.push(key);
      else columns.push(key);
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
// Match priority:
//   1. exact fieldKey match (case-sensitive)
//   2. case-insensitive trimmed label match
//   3. fuzzy: strip non-alphanumeric, compare lowercase
export function autoMapColumns(columns, formFields) {
  const byKey = new Map(formFields.map((f) => [f.fieldKey, f]));
  const byLabel = new Map(formFields.map((f) => [String(f.label || '').trim().toLowerCase(), f]));
  const byFuzzy = new Map(formFields.map((f) => [
    String(f.label || '').toLowerCase().replace(/[^a-z0-9]+/g, ''),
    f,
  ]));

  const mapping = {};
  for (const col of columns) {
    const t = String(col || '').trim();
    let match = byKey.get(t)
      || byLabel.get(t.toLowerCase())
      || byFuzzy.get(t.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    mapping[col] = match ? match.fieldKey : null;
  }
  return mapping;
}

// Translate `rows` (keyed by column label) into rows keyed by fieldKey using
// the mapping. Drops columns mapped to null.
export function remapRows(rows, mapping) {
  return rows.map((row) => {
    const out = {};
    for (const [col, value] of Object.entries(row)) {
      const fieldKey = mapping[col];
      if (!fieldKey) continue;
      if (value === undefined || value === null || value === '') continue;
      out[fieldKey] = value;
    }
    return out;
  });
}
