// One-off migration: copy form definitions (forms + fields + conditions) from
// the LOCAL SQLite dev DB into the LIVE Afrihost MySQL prod DB.
//
// Why two transport layers?
//   - Forms (small) are created via the live Vercel API so role/auth/activity
//     log all run normally.
//   - Fields/conditions (potentially hundreds) are written DIRECTLY to Afrihost
//     MySQL using mysql2. The Vercel function would time out at 30 s for a big
//     form (172 fields × Vercel-iad1 ↔ SA round-trip ≈ 40 s+), but a direct
//     connection from your laptop ↔ Afrihost is fast.
//
// Usage:
//   cd server
//   $env:PROD_URL = "https://website-v3-five-tawny.vercel.app"   # PowerShell
//   node scripts/migrate-forms-to-prod.js                        # all forms
//   node scripts/migrate-forms-to-prod.js --slug=intake          # one form
//   node scripts/migrate-forms-to-prod.js --dry-run              # preview

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

// ── 1. Parse CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : args.includes(`--${name}`) ? true : undefined;
};
const SLUG_FILTER = flag('slug');
const TITLE_FILTER = flag('title');
const DRY_RUN = !!flag('dry-run');

// ── 2. Load production credentials from .env.production ──────────────────────
const envPath = path.resolve('.env.production');
if (!fs.existsSync(envPath)) {
  console.error(`✖ ${envPath} not found.`);
  console.error('  Make sure you are running this from the server/ directory.');
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

const PROD_URL = (process.env.PROD_URL || '').replace(/\/$/, '');
const ADMIN_EMAIL = prodEnv.ADMIN_EMAIL;
const ADMIN_PASSWORD = prodEnv.ADMIN_PASSWORD;
const DATABASE_URL = prodEnv.DATABASE_URL;

if (!PROD_URL) {
  console.error('✖ PROD_URL env var is required.');
  console.error('  PowerShell: $env:PROD_URL = "https://your-project.vercel.app"');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('✖ ADMIN_EMAIL / ADMIN_PASSWORD missing from .env.production.');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('✖ DATABASE_URL missing from .env.production.');
  process.exit(1);
}

// ── 3. Helpers ───────────────────────────────────────────────────────────────
async function api(pathname, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${PROD_URL}/api${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

function encodeMaybeJSON(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value; // already JSON-encoded in dev
  return JSON.stringify(value);
}

// ── 4. Authenticate against prod ─────────────────────────────────────────────
console.log(`→ Logging into ${PROD_URL} as ${ADMIN_EMAIL}…`);
let token;
try {
  const auth = await api('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!auth.token) throw new Error('Login succeeded but no token returned.');
  if (auth.user?.kind !== 'admin') throw new Error('Logged in but account is not admin.');
  token = auth.token;
  console.log(`✓ Authenticated as admin (id=${auth.user.id}).`);
} catch (err) {
  console.error(`✖ Production login failed: ${err.message}`);
  process.exit(1);
}

// ── 5. Read forms from local dev SQLite ──────────────────────────────────────
console.log('→ Reading forms from local dev DB…');
const prisma = new PrismaClient();

let devForms;
try {
  devForms = await prisma.form.findMany({
    where: {
      ...(SLUG_FILTER ? { slug: SLUG_FILTER } : {}),
      ...(TITLE_FILTER ? { title: { contains: TITLE_FILTER } } : {}),
    },
    include: {
      fields: {
        orderBy: { position: 'asc' },
        include: { conditions: true },
      },
    },
    orderBy: { id: 'asc' },
  });
} catch (err) {
  console.error(`✖ Could not read from local dev DB: ${err.message}`);
  await prisma.$disconnect();
  process.exit(1);
}

if (devForms.length === 0) {
  console.log('• No forms found in local dev DB matching your filter.');
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`✓ Found ${devForms.length} form${devForms.length === 1 ? '' : 's'} in dev:`);
for (const f of devForms) {
  const condCount = f.fields.reduce((n, fld) => n + (fld.conditions?.length || 0), 0);
  console.log(`    · "${f.title}"  (slug: ${f.slug}, fields: ${f.fields.length}, conditions: ${condCount})`);
}

// ── 6. Open direct MySQL connection to prod ──────────────────────────────────
console.log('→ Connecting directly to Afrihost MySQL…');
let conn;
try {
  conn = await mysql.createConnection({
    uri: DATABASE_URL,
    multipleStatements: false,
  });
  await conn.query('SELECT 1');
  console.log('✓ MySQL connection established.');
} catch (err) {
  console.error(`✖ Could not connect to prod MySQL: ${err.message}`);
  console.error('  Make sure your laptop IP (or %) is whitelisted in Afrihost Remote MySQL.');
  await prisma.$disconnect();
  process.exit(1);
}

// ── 7. Check existing prod forms by slug ─────────────────────────────────────
const slugs = devForms.map((f) => f.slug);
const [existingRows] = await conn.execute(
  `SELECT id, slug FROM forms WHERE slug IN (${slugs.map(() => '?').join(',')})`,
  slugs,
);
const existingBySlug = new Map(existingRows.map((r) => [r.slug, r.id]));
console.log(`✓ Prod has ${existingRows.length} form${existingRows.length === 1 ? '' : 's'} matching your dev slugs already.`);

// ── 8. Migrate each form ─────────────────────────────────────────────────────
let created = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

for (const devForm of devForms) {
  if (DRY_RUN) {
    const where = existingBySlug.has(devForm.slug) ? 'UPDATE (replace fields)' : 'CREATE';
    console.log(`• DRY    ${where}  "${devForm.title}"  (${devForm.fields.length} fields)`);
    continue;
  }

  try {
    let formId = existingBySlug.get(devForm.slug);

    // ── 8a. Create the form (via API for logging) if it doesn't exist ───
    if (!formId) {
      console.log(`→ Creating form "${devForm.title}" via API…`);
      const { form: newForm } = await api('/admin/forms', {
        method: 'POST',
        token,
        body: {
          title: devForm.title,
          slug: devForm.slug,
          ...(devForm.description ? { description: devForm.description } : {}),
        },
      });
      formId = newForm.id;
      console.log(`✓ Form created (id ${formId}).`);
      created += 1;
    } else {
      console.log(`→ Form "${devForm.title}" already exists (id ${formId}). Replacing fields.`);
      updated += 1;
    }

    // ── 8b. Wipe existing fields/conditions/answers for this form ──────
    // We're in a one-shot migration so it's safe to drop and re-insert.
    await conn.execute('DELETE FROM field_conditions WHERE field_id IN (SELECT id FROM form_fields WHERE form_id = ?)', [formId]);
    await conn.execute('DELETE FROM form_fields WHERE form_id = ?', [formId]);

    // ── 8c. Bulk-insert fields ──────────────────────────────────────────
    if (devForm.fields.length) {
      // NOTE on updated_at: Prisma's @updatedAt is a CLIENT-SIDE trigger,
      // not a MySQL column DEFAULT. Raw INSERT must set it explicitly or
      // Prisma blows up trying to deserialize NULL on subsequent reads.
      const now = new Date();
      const fieldRows = devForm.fields.map((f, i) => [
        formId,
        f.fieldKey,
        f.label || 'Untitled',
        f.type || 'text',
        f.placeholder ?? null,
        f.helpText ?? null,
        f.isRequired ? 1 : 0,
        i, // position
        encodeMaybeJSON(f.options),
        encodeMaybeJSON(f.validation),
        now, // created_at
        now, // updated_at
      ]);
      const [insertResult] = await conn.query(
        `INSERT INTO form_fields
           (form_id, field_key, label, type, placeholder, help_text, is_required, position, options, validation, created_at, updated_at)
         VALUES ?`,
        [fieldRows],
      );
      // mysql2 sets insertId to FIRST inserted row id. Subsequent rows are insertId+1, +2, etc.
      const firstFieldId = insertResult.insertId;

      // ── 8d. Bulk-insert conditions ────────────────────────────────────
      const condRows = [];
      for (let i = 0; i < devForm.fields.length; i++) {
        const fieldDbId = firstFieldId + i;
        const conds = devForm.fields[i].conditions || [];
        for (const c of conds) {
          condRows.push([
            fieldDbId,
            c.dependsOnKey,
            c.operator,
            String(c.value ?? ''),
            c.action,
          ]);
        }
      }
      if (condRows.length) {
        await conn.query(
          `INSERT INTO field_conditions (field_id, depends_on_key, operator, value, action) VALUES ?`,
          [condRows],
        );
      }

      console.log(`✓ Inserted ${fieldRows.length} fields and ${condRows.length} conditions for "${devForm.title}".`);
    }
  } catch (err) {
    console.error(`✖ FAIL  "${devForm.title}": ${err.message}`);
    if (err.details) console.error(`        details: ${JSON.stringify(err.details)}`);
    failed += 1;
  }
}

await conn.end();
await prisma.$disconnect();

console.log('');
console.log('───── Summary ─────');
console.log(`Created: ${created}`);
console.log(`Updated: ${updated}  (replaced fields on existing form)`);
console.log(`Skipped: ${skipped}`);
console.log(`Failed:  ${failed}`);
if (DRY_RUN) console.log('(dry-run — nothing actually written)');
process.exit(failed === 0 ? 0 : 2);
