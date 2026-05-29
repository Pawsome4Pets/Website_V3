// Post-import cleanup: replace every cognitoforms.com file URL in your
// submissions with a self-hosted copy on Vercel Blob.
//
// After this runs you can cancel Cognito with no data loss — every file lives
// on YOUR Vercel Blob and the admin UI shows it as a regular FileUpload row,
// identical to files uploaded directly via the public form.
//
// What it does, per file:
//   1. Reads every submission_answers.value from Afrihost MySQL.
//   2. Finds URLs matching *.cognitoforms.com (regex).
//   3. Downloads each file (HTTP GET, no auth — Cognito file URLs are public).
//   4. Uploads to Vercel Blob via @vercel/blob put().
//   5. Creates a `file_uploads` row linked to the submission + fieldKey, just
//      like a native /api/uploads upload would.
//   6. Rewrites the answer value to use the new Blob URL (so any inline text
//      reference keeps working too).
//   7. Skips URLs that are already on Vercel (idempotent — safe to re-run).
//
// Usage:
//   cd server
//   $env:DATABASE_URL          = "mysql://..."   # from .env.production
//   $env:BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_..."  # see step below
//   node scripts/rehost-cognito-files.js              # do it
//   node scripts/rehost-cognito-files.js --dry-run    # preview only
//
// Get BLOB_READ_WRITE_TOKEN from:
//   Vercel dashboard → your project → Storage tab → click the Blob store →
//   Settings tab → "Read-Write Token" → copy.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { put } from '@vercel/blob';

// ── 1. Args + env ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`) || args.some((a) => a.startsWith(`--${n}=`));
const DRY_RUN = flag('dry-run');
const VERBOSE = flag('verbose');

// Load .env.production for DATABASE_URL if not already in env.
const envPath = path.resolve('.env.production');
const envFile = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          let v = l.slice(i + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          return [l.slice(0, i).trim(), v];
        }),
    )
  : {};

const DATABASE_URL = process.env.DATABASE_URL || envFile.DATABASE_URL;
const BLOB_TOKEN   = process.env.BLOB_READ_WRITE_TOKEN || envFile.BLOB_READ_WRITE_TOKEN;

if (!DATABASE_URL) {
  console.error('✖ DATABASE_URL is required (set it or include in .env.production).');
  process.exit(1);
}
if (!BLOB_TOKEN && !DRY_RUN) {
  console.error('✖ BLOB_READ_WRITE_TOKEN is required for real runs.');
  console.error('  Get it: Vercel → project → Storage → Blob store → Settings → Read-Write Token.');
  console.error('  Or run with --dry-run first to preview what will be rehosted.');
  process.exit(1);
}

// ── 2. Helpers ──────────────────────────────────────────────────────────────
// Matches any cognitoforms.com URL up to whitespace, quote, comma, or bracket.
const COGNITO_URL_RE = /https?:\/\/(?:[a-z0-9-]+\.)*cognitoforms\.com\/[^\s"',\]}\\]+/gi;

function extractCognitoUrls(value) {
  if (value == null) return [];
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const set = new Set();
  for (const m of text.matchAll(COGNITO_URL_RE)) set.add(m[0]);
  return Array.from(set);
}

function guessFilename(url, contentDisposition) {
  // Prefer Content-Disposition filename if the server gave us one.
  if (contentDisposition) {
    const m = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (m) return decodeURIComponent(m[1]);
  }
  // Fallback: last path segment.
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop() || 'file';
    return decodeURIComponent(seg);
  } catch { return 'file'; }
}

function extOf(name, mime) {
  const m = name.match(/\.([a-z0-9]{1,8})$/i);
  if (m) return '.' + m[1].toLowerCase();
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  return map[mime] || '';
}

async function downloadAndRehost(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const mime = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
  const cd = res.headers.get('content-disposition');
  const originalName = guessFilename(url, cd).slice(0, 250);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = extOf(originalName, mime);
  const key = `cognito-import/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const blob = await put(key, buffer, {
    access: 'public',
    contentType: mime,
    token: BLOB_TOKEN,
  });
  return {
    blobUrl: blob.url,
    originalName,
    mimeType: mime,
    sizeBytes: buffer.length,
  };
}

// ── 3. Connect + scan ──────────────────────────────────────────────────────
console.log(`→ Connecting to MySQL…`);
const conn = await mysql.createConnection({ uri: DATABASE_URL, multipleStatements: false });
await conn.query('SELECT 1');
console.log(`✓ Connected.`);

console.log(`→ Scanning submission_answers for cognitoforms.com URLs…`);
const [answers] = await conn.execute(`
  SELECT sa.id, sa.submission_id, sa.field_id, sa.value, sf.field_key
  FROM submission_answers sa
  JOIN form_fields sf ON sf.id = sa.field_id
  WHERE sa.value LIKE '%cognitoforms.com%'
`);
console.log(`✓ Found ${answers.length} answer${answers.length === 1 ? '' : 's'} with Cognito URLs.`);

if (answers.length === 0) {
  console.log('Nothing to rehost. Done.');
  await conn.end();
  process.exit(0);
}

// Total unique URLs across all answers
const uniqueUrls = new Set();
for (const a of answers) for (const u of extractCognitoUrls(a.value)) uniqueUrls.add(u);
console.log(`  ${uniqueUrls.size} distinct file URLs to rehost.`);

if (DRY_RUN) {
  console.log('\n(dry-run — nothing downloaded or written)');
  for (const a of answers.slice(0, 20)) {
    const urls = extractCognitoUrls(a.value);
    console.log(`  submission ${a.submission_id} · field ${a.field_key} → ${urls.length} URL(s)`);
  }
  if (answers.length > 20) console.log(`  …and ${answers.length - 20} more`);
  await conn.end();
  process.exit(0);
}

// ── 4. Download + upload + update DB ───────────────────────────────────────
const urlCache = new Map(); // dedupe across answers
let downloaded = 0;
let failed = 0;
let answersUpdated = 0;
let fileUploadsCreated = 0;

for (const a of answers) {
  const urls = extractCognitoUrls(a.value);
  if (urls.length === 0) continue;

  let newValue = a.value;
  for (const url of urls) {
    let info = urlCache.get(url);
    if (!info) {
      try {
        info = await downloadAndRehost(url);
        downloaded += 1;
        urlCache.set(url, info);
        if (VERBOSE) console.log(`  ✓ ${url}\n      → ${info.blobUrl} (${info.sizeBytes} bytes)`);
      } catch (err) {
        console.error(`  ✖ ${url}: ${err.message}`);
        failed += 1;
        urlCache.set(url, null); // negative cache so we don't retry
        continue;
      }
    }
    if (!info) continue;

    // Replace every occurrence of this URL inside the answer value (works for
    // plain text values AND for JSON-encoded repeater arrays).
    newValue = newValue.split(url).join(info.blobUrl);

    // Create a `file_uploads` row so the admin Submission Detail page shows
    // this file as a regular attachment, identical to native uploads.
    try {
      await conn.execute(
        `INSERT INTO file_uploads (submission_id, field_key, original_name, storage_path, mime_type, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [a.submission_id, a.field_key, info.originalName, info.blobUrl, info.mimeType, info.sizeBytes],
      );
      fileUploadsCreated += 1;
    } catch (err) {
      console.error(`  ✖ file_uploads insert failed for submission ${a.submission_id}: ${err.message}`);
    }
  }

  if (newValue !== a.value) {
    await conn.execute(`UPDATE submission_answers SET value = ? WHERE id = ?`, [newValue, a.id]);
    answersUpdated += 1;
  }
}

await conn.end();

console.log('');
console.log('───── Summary ─────');
console.log(`Downloaded & rehosted : ${downloaded}`);
console.log(`Failed downloads      : ${failed}`);
console.log(`Answers updated       : ${answersUpdated}`);
console.log(`file_uploads created  : ${fileUploadsCreated}`);
console.log('');
console.log(failed === 0
  ? '✓ All Cognito URLs replaced. You can cancel Cognito Forms when ready.'
  : '⚠ Some downloads failed. Re-run the script (it skips already-rehosted URLs); failures are usually transient network issues.');

process.exit(failed === 0 ? 0 : 2);
