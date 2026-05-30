// One-off bulk import: parse a legacy Excel file (Cognito Forms export or
// similar) on YOUR LAPTOP and write submissions + answers DIRECTLY to the
// LIVE Afrihost MySQL prod DB.
//
// Why a CLI instead of the /admin/import web UI?
//   Vercel serverless functions cap out around 60s, hard-limit request
//   bodies at 4.5 MB, and cold-start a fresh Prisma client per instance.
//   For a 405-row import (≈10k answer rows) against Afrihost MySQL with
//   ~250ms round-trip latency, you fight all three limits at once and
//   chunks time out / 500. From your laptop's direct mysql2 connection
//   the same import takes ~30 seconds with no drama.
//
// Usage:
//   cd server
//   $env:PROD_URL = "https://website-v3-five-tawny.vercel.app"   # PowerShell
//   node scripts/migrate-submissions-to-prod.js \
//     --file="C:\Users\jouma\Downloads\oldPawsome4PetsNewClientApplicationForm.xlsx" \
//     --form-slug=new-client-application
//
//   # other knobs:
//   --form-id=1                  # use a form id directly instead of slug
//   --dry-run                    # parse + map but DO NOT write
//   --replace                    # delete all existing submissions for the
//                                # form first (use with care!)
//   --tag="cognito 2024 batch"   # tag inserted submissions' userAgent so
//                                # you can identify / wipe this import later

import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

import {
  parseExcelSubmissions,
  parseJsonSubmissions,
  autoMapColumns,
  remapRows,
  findConsentFieldKeys,
  extractAndReplicate,
  IMPORT_LIB_VERSION,
} from '../../src/lib/submissionsImport.js';

// ─── 1. CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : args.includes(`--${name}`) ? true : undefined;
};
const FILE = flag('file');
const FORM_ID = flag('form-id') ? Number(flag('form-id')) : undefined;
const FORM_SLUG = flag('form-slug');
const DRY_RUN = !!flag('dry-run');
const REPLACE = !!flag('replace');
const TAG = flag('tag') || 'cli-import';

if (!FILE) {
  console.error('✖ --file=<path-to-.xlsx-or-.json> is required.');
  process.exit(1);
}
if (!FORM_ID && !FORM_SLUG) {
  console.error('✖ Provide either --form-id=N or --form-slug=foo.');
  process.exit(1);
}
if (!fs.existsSync(FILE)) {
  console.error(`✖ File not found: ${FILE}`);
  process.exit(1);
}

console.log(`Import engine: ${IMPORT_LIB_VERSION}`);
console.log(`File:          ${FILE}`);
console.log(`Target form:   ${FORM_ID ? `id=${FORM_ID}` : `slug=${FORM_SLUG}`}`);
console.log(`Mode:          ${DRY_RUN ? 'DRY RUN' : REPLACE ? 'REPLACE (existing wiped)' : 'append'}`);

// ─── 2. Load .env.production ────────────────────────────────────────────────
const envPath = path.resolve('.env.production');
if (!fs.existsSync(envPath)) {
  console.error(`✖ ${envPath} not found. Run from the server/ directory.`);
  process.exit(1);
}
const prodEnv = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    }),
);
const DATABASE_URL = prodEnv.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('✖ DATABASE_URL missing from .env.production.');
  process.exit(1);
}

// ─── 3. Parse the source file using the same lib the web UI uses ────────────
console.log('\n→ Parsing source file…');
let parsed;
try {
  const lower = FILE.toLowerCase();
  if (lower.endsWith('.json')) {
    const text = fs.readFileSync(FILE, 'utf8');
    parsed = parseJsonSubmissions(text, { fileName: path.basename(FILE) });
  } else {
    const buf = fs.readFileSync(FILE);
    parsed = parseExcelSubmissions(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      { fileName: path.basename(FILE) },
    );
  }
} catch (err) {
  console.error(`✖ Could not parse file: ${err.message}`);
  process.exit(1);
}
console.log(`✓ ${parsed.sourceLabel}`);
console.log(`  ${parsed.columns.length} columns, ${parsed.rows.length} rows`);
if (parsed.ignoredMetaColumns.length) {
  console.log(`  Ignored meta columns: ${parsed.ignoredMetaColumns.join(', ')}`);
}

// ─── 4. Connect to Afrihost ─────────────────────────────────────────────────
console.log('\n→ Connecting to Afrihost MySQL…');
let conn;
try {
  conn = await mysql.createConnection({
    uri: DATABASE_URL,
    multipleStatements: false,
    dateStrings: true,
  });
  await conn.query('SELECT 1');
  console.log('✓ Connected.');
} catch (err) {
  console.error(`✖ Could not connect: ${err.message}`);
  console.error('  Whitelist your laptop IP in Afrihost Remote MySQL if you haven\'t.');
  process.exit(1);
}

// ─── 5. Resolve the target form + load its fields ──────────────────────────
console.log('\n→ Loading target form…');
let form;
try {
  const [rows] = FORM_ID
    ? await conn.execute(`SELECT id, slug, title FROM forms WHERE id = ? LIMIT 1`, [FORM_ID])
    : await conn.execute(`SELECT id, slug, title FROM forms WHERE slug = ? LIMIT 1`, [FORM_SLUG]);
  if (!rows.length) throw new Error(`No form matching ${FORM_ID ? `id ${FORM_ID}` : `slug "${FORM_SLUG}"`}`);
  form = rows[0];
} catch (err) {
  console.error(`✖ ${err.message}`);
  await conn.end();
  process.exit(1);
}
console.log(`✓ Target: "${form.title}" (id=${form.id}, slug=${form.slug})`);

const [fieldRows] = await conn.execute(
  `SELECT id, field_key, label, type, options, help_text FROM form_fields WHERE form_id = ? ORDER BY position ASC`,
  [form.id],
);
const formFields = fieldRows.map((r) => ({
  id: r.id,
  fieldKey: r.field_key,
  label: r.label,
  type: r.type,
  helpText: r.help_text,
  options: (() => { try { return r.options ? JSON.parse(r.options) : null; } catch { return null; } })(),
}));
const fieldByKey = new Map(formFields.map((f) => [f.fieldKey, f.id]));
console.log(`  ${formFields.length} fields on this form.`);

// ─── 6. Build mapping (same logic as web UI) ────────────────────────────────
console.log('\n→ Auto-mapping columns…');
const arrayColumns = new Set();
for (const r of parsed.rows) {
  for (const [c, v] of Object.entries(r)) if (Array.isArray(v)) arrayColumns.add(c);
}
const mapping = autoMapColumns(parsed.columns, formFields, { arrayColumns });
const mapped = Object.entries(mapping).filter(([, v]) => v);
console.log(`✓ Auto-mapped ${mapped.length} / ${parsed.columns.length} columns.`);
const unmapped = Object.entries(mapping).filter(([, v]) => !v).map(([k]) => k);
if (unmapped.length) {
  console.log(`  Unmapped (will be ignored):`);
  for (const c of unmapped) console.log(`    · ${c.slice(0, 80)}${c.length > 80 ? '…' : ''}`);
}

// ─── 7. Remap + extract + consent ───────────────────────────────────────────
console.log('\n→ Building rows…');
let rows = remapRows(parsed.rows, mapping).filter((r) => Object.keys(r).length > 0);
rows = rows.map((r) => {
  const extra = extractAndReplicate(r, formFields);
  return { ...extra, ...r };
});
const consentKeys = findConsentFieldKeys(formFields);
if (consentKeys.length) {
  rows = rows.map((r) => {
    const next = { ...r };
    for (const k of consentKeys) if (next[k] == null) next[k] = 'Yes';
    return next;
  });
  console.log(`  ${consentKeys.length} consent field${consentKeys.length === 1 ? '' : 's'} will be auto-ticked.`);
}

// Filter rows to only fields that exist on the form (skip the rest).
let totalAnswerCount = 0;
const finalRows = rows.map((row) => {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (!fieldByKey.has(k)) continue;
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s === '') continue;
    out[k] = s.slice(0, 65_000);
  }
  totalAnswerCount += Object.keys(out).length;
  return out;
}).filter((r) => Object.keys(r).length > 0);

console.log(`✓ ${finalRows.length} rows ready, ${totalAnswerCount.toLocaleString()} answers total.`);

if (DRY_RUN) {
  console.log('\n(dry-run — nothing written)');
  console.log(`Sample row (first):`);
  console.log(JSON.stringify(finalRows[0], null, 2));
  await conn.end();
  process.exit(0);
}

// ─── 8. Optional wipe ───────────────────────────────────────────────────────
if (REPLACE) {
  console.log('\n→ Wiping existing submissions for this form…');
  const [delAns] = await conn.execute(
    `DELETE FROM submission_answers WHERE submission_id IN (SELECT id FROM form_submissions WHERE form_id = ?)`,
    [form.id],
  );
  const [delSubs] = await conn.execute(`DELETE FROM form_submissions WHERE form_id = ?`, [form.id]);
  console.log(`  Removed ${delSubs.affectedRows} submissions and ${delAns.affectedRows} answers.`);
}

// ─── 9. Bulk INSERT in chunks ───────────────────────────────────────────────
// Strategy: insert N submissions in one VALUES (...) (...) (...) statement,
// MySQL returns the first auto_increment id, then we know subsequent ids
// are firstId, firstId+1, firstId+2, ... (true for standard auto_increment).
// Then we build all answer rows in one big VALUES block per chunk.
console.log('\n→ Writing to Afrihost…');
const CHUNK = 100;
let createdTotal = 0;
let answersTotal = 0;
const t0 = Date.now();

for (let off = 0; off < finalRows.length; off += CHUNK) {
  const slice = finalRows.slice(off, off + CHUNK);
  const subValues = slice.map(() => [form.id, 'submitted', null, TAG]);
  const [subResult] = await conn.query(
    `INSERT INTO form_submissions (form_id, status, ip_address, user_agent) VALUES ?`,
    [subValues],
  );
  const firstSubId = subResult.insertId;

  // Build answers
  const answerRows = [];
  for (let i = 0; i < slice.length; i++) {
    const subId = firstSubId + i;
    for (const [fieldKey, value] of Object.entries(slice[i])) {
      const fieldId = fieldByKey.get(fieldKey);
      if (!fieldId) continue;
      answerRows.push([subId, fieldId, value]);
    }
  }
  if (answerRows.length) {
    // Chunk answers too — MySQL has a max_allowed_packet limit (default 4MB).
    // 1000 rows per insert keeps each statement comfortably small.
    const ANS_CHUNK = 1000;
    for (let aOff = 0; aOff < answerRows.length; aOff += ANS_CHUNK) {
      const aSlice = answerRows.slice(aOff, aOff + ANS_CHUNK);
      await conn.query(
        `INSERT INTO submission_answers (submission_id, field_id, value) VALUES ?`,
        [aSlice],
      );
    }
  }
  createdTotal += slice.length;
  answersTotal += answerRows.length;
  const pct = Math.round((createdTotal / finalRows.length) * 100);
  process.stdout.write(`\r  ${createdTotal} / ${finalRows.length} submissions  (${pct}%)  ${answersTotal.toLocaleString()} answers   `);
}
const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ Done in ${dt}s.`);

await conn.end();

console.log('\n───── Summary ─────');
console.log(`Form:        ${form.title} (id ${form.id})`);
console.log(`Submissions: ${createdTotal}`);
console.log(`Answers:     ${answersTotal.toLocaleString()}`);
console.log(`Tag:         ${TAG}  (visible on submission detail "UA" line)`);
console.log(`Took:        ${dt}s`);
