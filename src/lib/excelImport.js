// Excel importer for legacy Cognito Forms exports.
//
// Cognito Forms can be exported as Excel (.xlsx) — typically as an "Entries"
// export where the first row is column headers (= field labels) and each
// subsequent row is one submission. We use the header row to reconstruct the
// FORM DEFINITION; the data rows are optional but, when present, become past
// submissions seeded against the new form.
//
// The output shape matches parseCognitoForm() in cognitoImport.js so the
// existing preview UI can render either source without branching.

import * as XLSX from 'xlsx';

// Header-name heuristics → infer field type when the Cognito export doesn't
// give us one explicitly. Order matters — more specific keywords come first.
const TYPE_HEURISTICS = [
  [/(^|\s)(e[-_ ]?mail|email)(\s|$)/i, 'email'],
  [/(^|\s)(phone|mobile|cell|tel|telephone|whatsapp)(\s|$)/i, 'tel'],
  [/(^|\s)(url|website|web|site|link)(\s|$)/i, 'url'],
  [/(^|\s)(d\.?o\.?b|date of birth|birthday|birth date|birthdate)(\s|$)/i, 'date'],
  [/(^|\s)(date|day|when)(\s|$)/i, 'date'],
  [/(^|\s)(age|count|qty|quantity|number|amount|weight|kg|years?|months?)(\s|$)/i, 'number'],
  [/(^|\s)(notes?|comments?|message|description|additional|tell us|anything else)(\s|$)/i, 'textarea'],
  [/(^|\s)(address|street|suburb|location)(\s|$)/i, 'textarea'],
  [/(^|\s)(consent|agree|terms|accept|opt[-_ ]?in)(\s|$)/i, 'checkbox'],
  [/(^|\s)(yes\/no|y\/n)(\s|$)/i, 'radio'],
  [/(^|\s)(sex|gender|sterilized|spayed|neutered)(\s|$)/i, 'radio'],
];

function inferType(label, sampleValues) {
  const text = String(label || '').trim();
  for (const [pattern, type] of TYPE_HEURISTICS) {
    if (pattern.test(text)) return type;
  }
  // Look at the data for a hint — all yes/no → radio; all numbers → number;
  // any value contains a newline → textarea.
  const nonEmpty = (sampleValues || []).map((v) => String(v ?? '').trim()).filter(Boolean);
  if (nonEmpty.length === 0) return 'text';
  const allYesNo = nonEmpty.every((v) => /^(yes|no|y|n|true|false)$/i.test(v));
  if (allYesNo) return 'radio';
  const allNumbers = nonEmpty.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (allNumbers) return 'number';
  const looksLikeEmail = nonEmpty.every((v) => /@/.test(v));
  if (looksLikeEmail) return 'email';
  const looksLikeDate = nonEmpty.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v));
  if (looksLikeDate) return 'date';
  const hasLongOrMultiline = nonEmpty.some((v) => v.length > 80 || /\r|\n/.test(v));
  if (hasLongOrMultiline) return 'textarea';
  return 'text';
}

function slugifyKey(s) {
  const base = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return base || `field_${Math.random().toString(36).slice(2, 8)}`;
}

// For radio/select/checkbox we collect the distinct non-empty values from the
// data rows and use them as options.
function distinctOptions(sampleValues, max = 30) {
  const seen = new Map();
  for (const raw of sampleValues || []) {
    const v = String(raw ?? '').trim();
    if (!v) continue;
    // For checkbox-style cells that joined multiple options with commas/semicolons.
    const parts = v.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const key = part.toLowerCase();
      if (!seen.has(key)) seen.set(key, part);
      if (seen.size >= max) break;
    }
    if (seen.size >= max) break;
  }
  return Array.from(seen.values());
}

function dedupeKeys(fields) {
  const seen = new Map();
  return fields.map((f) => {
    const base = f.fieldKey;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? f : { ...f, fieldKey: `${base}_${n}` };
  });
}

// Columns Cognito adds automatically that aren't actual form fields. We hide
// these from the imported field list (but still pass their values through to
// submissions when available).
const META_COLUMNS = new Set([
  'entry', 'entry id', 'entry number', 'id', 'submission id',
  'date submitted', 'date created', 'date updated', 'date',
  'status', 'role', 'assigned to', 'entry origin', 'origin',
  'entry ip', 'ip address', 'ip',
]);

function isMetaColumn(label) {
  const norm = String(label || '').trim().toLowerCase();
  if (!norm) return true;
  return META_COLUMNS.has(norm);
}

/**
 * Parse an Excel file (ArrayBuffer or Uint8Array) exported from Cognito Forms.
 *
 * @param {ArrayBuffer | Uint8Array} buffer
 * @param {object} [opts]
 * @param {string} [opts.fileName]  used to seed the form title if no other hint
 * @returns {{ title: string, description: string, fields: Array, submissions: Array }}
 */
export function parseCognitoExcel(buffer, opts = {}) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch (err) {
    throw new Error(`Could not read Excel file: ${err.message}`);
  }

  if (!workbook.SheetNames.length) {
    throw new Error('The Excel workbook has no sheets.');
  }

  // Cognito's Excel exports put the data on the first sheet. Use that unless
  // it's clearly an empty placeholder, in which case fall back to the first
  // sheet that has any rows.
  let sheetName = workbook.SheetNames[0];
  let rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });
  if (rows.length < 2) {
    for (const name of workbook.SheetNames) {
      const r = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1, defval: '', blankrows: false, raw: false,
      });
      if (r.length >= 2) { sheetName = name; rows = r; break; }
    }
  }

  if (rows.length === 0) {
    throw new Error('No rows found in the Excel file.');
  }

  const [headerRow, ...dataRows] = rows;

  if (!headerRow.some((c) => String(c || '').trim().length > 0)) {
    throw new Error('The first row of the sheet is empty — expected column headers.');
  }

  // Build per-column sample arrays so type inference can look at real values.
  const fields = [];
  for (let col = 0; col < headerRow.length; col++) {
    const label = String(headerRow[col] || '').trim();
    if (!label) continue;
    if (isMetaColumn(label)) continue;

    const sample = dataRows.slice(0, 200).map((r) => r[col]);
    const type = inferType(label, sample);
    const fieldKey = slugifyKey(label);

    const field = {
      fieldKey,
      label: label.slice(0, 200),
      type,
      placeholder: '',
      helpText: '',
      isRequired: false,
      options: null,
      validation: null,
      conditions: [],
      _sourceType: 'excel-column',
      _column: col,
    };

    if (['radio', 'select', 'checkbox'].includes(type)) {
      const opts = distinctOptions(sample, 30);
      if (opts.length) field.options = opts;
      else if (type === 'radio') field.options = ['Yes', 'No'];
    }

    fields.push(field);
  }

  const deduped = dedupeKeys(fields);

  // Optional submission preview — each row → { [fieldKey]: value }.
  const submissions = dataRows
    .filter((r) => r.some((c) => String(c ?? '').trim().length > 0))
    .map((r) => {
      const entry = {};
      for (const f of deduped) {
        const raw = r[f._column];
        if (raw === undefined || raw === '' || raw === null) continue;
        entry[f.fieldKey] = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw);
      }
      return entry;
    });

  const title = (opts.fileName || sheetName || 'Imported Excel form')
    .replace(/\.(xlsx|xls|csv)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 200) || 'Imported Excel form';

  // Strip internal _column markers before returning fields the caller will
  // post to the API (keep _sourceType for the preview UI to label).
  const cleanFields = deduped.map(({ _column, ...rest }) => rest);

  return {
    title,
    description: '',
    fields: cleanFields,
    submissions,
  };
}
