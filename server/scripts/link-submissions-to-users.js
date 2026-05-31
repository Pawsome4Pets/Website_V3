// One-off backfill: for every FormSubmission with user_id = NULL, extract the
// owner's email + name from stored answers and find-or-create a User row, then
// set form_submissions.user_id.
//
// Why a CLI instead of an API endpoint?
//   Same reason as migrate-submissions-to-prod.js — direct mysql2 from your
//   laptop avoids Vercel function timeouts and body-size limits for bulk work.
//
// Usage (run from server/ directory):
//   node scripts/link-submissions-to-users.js --dry-run
//   node scripts/link-submissions-to-users.js
//   node scripts/link-submissions-to-users.js --form-id=1   # limit to one form
//
// Extraction priority per submission:
//   1. owners repeater JSON → EmailAddress, OwnerName_First, OwnerName_Last
//   2. Scalar answer fields: rr_email / vet_owner_email,
//                            rr_owner_first / vet_owner_first,
//                            rr_owner_last  / vet_owner_last
//
// Idempotent: running twice is safe — existing user links are preserved and
// already-linked submissions are skipped entirely.

import mysql from 'mysql2/promise';
import bcryptjs from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ─── 1. CLI args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : args.includes(`--${name}`) ? true : undefined;
};

const DRY_RUN = !!flag('dry-run');
const FORM_ID = flag('form-id') ? Number(flag('form-id')) : null;

console.log(`Mode:      ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
if (FORM_ID) console.log(`Form:      id=${FORM_ID}`);

// ─── 2. Load .env.production ──────────────────────────────────────────────────
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const DATABASE_URL = prodEnv.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('✖ DATABASE_URL missing from .env.production.');
  process.exit(1);
}

// ─── 3. Connect ───────────────────────────────────────────────────────────────
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
  console.error(`✖ Connection failed: ${err.message}`);
  console.error('  Whitelist your laptop IP in Afrihost Remote MySQL if needed.');
  process.exit(1);
}

// ─── 4. Load unlinked submissions ─────────────────────────────────────────────
console.log('\n→ Loading submissions with user_id = NULL…');
const whereParts = ['fs.user_id IS NULL'];
const whereParams = [];
if (FORM_ID) { whereParts.push('fs.form_id = ?'); whereParams.push(FORM_ID); }

const [submissions] = await conn.query(
  `SELECT fs.id AS submission_id
   FROM form_submissions fs
   WHERE ${whereParts.join(' AND ')}
   ORDER BY fs.id`,
  whereParams,
);
console.log(`  Found ${submissions.length} unlinked submission(s).`);

if (submissions.length === 0) {
  console.log('✓ Nothing to do.');
  await conn.end();
  process.exit(0);
}

// ─── 5. Load all answers for those submissions (single query) ─────────────────
const ids = submissions.map((r) => r.submission_id);
const placeholders = ids.map(() => '?').join(',');

const [answerRows] = await conn.query(
  `SELECT sa.submission_id, ff.field_key, sa.value
   FROM submission_answers sa
   JOIN form_fields ff ON sa.field_id = ff.id
   WHERE sa.submission_id IN (${placeholders})`,
  ids,
);

const answerMap = new Map();
for (const row of answerRows) {
  if (!answerMap.has(row.submission_id)) answerMap.set(row.submission_id, {});
  answerMap.get(row.submission_id)[row.field_key] = row.value;
}

// ─── 6. Helper: extract identity from one submission's answers ────────────────
function extractIdentity(byKey) {
  let email = null, firstName = null, lastName = null;

  // Try owners repeater JSON first
  const ownersRaw = byKey['owners'];
  if (ownersRaw) {
    try {
      const owners = JSON.parse(ownersRaw);
      if (Array.isArray(owners) && owners.length > 0) {
        const o = owners[0];
        email = o.EmailAddress || o.emailaddress || o.email || null;
        firstName = o.OwnerName_First || o.ownername_first || o.FirstName || o.firstName || null;
        lastName = o.OwnerName_Last || o.ownername_last || o.LastName || o.lastName || null;
      }
    } catch { /* bad JSON, fall through */ }
  }

  // Fall back to scalar fields
  if (!email)     email     = byKey['rr_email']        || byKey['vet_owner_email']  || null;
  if (!firstName) firstName = byKey['rr_owner_first']  || byKey['vet_owner_first']  || null;
  if (!lastName)  lastName  = byKey['rr_owner_last']   || byKey['vet_owner_last']   || null;

  // Reject clearly invalid emails
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;

  return {
    email:     email     ? email.toLowerCase().trim()       : null,
    firstName: firstName ? String(firstName).trim().slice(0, 120) : null,
    lastName:  lastName  ? String(lastName).trim().slice(0, 120)  : null,
  };
}

// ─── 7. Look up the 'user' role ID ───────────────────────────────────────────
const [[userRole]] = await conn.query("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
const userRoleId = userRole ? userRole.id : null;
const bcryptRounds = Number(prodEnv.BCRYPT_ROUNDS || 12);

// ─── 8. Process submissions ───────────────────────────────────────────────────
let linked = 0, created = 0, skippedNoEmail = 0, errors = 0;

for (const { submission_id } of submissions) {
  const byKey = answerMap.get(submission_id) || {};
  const { email, firstName, lastName } = extractIdentity(byKey);

  if (!email) {
    console.log(`  #${submission_id}: no email found — skipped`);
    skippedNoEmail++;
    continue;
  }

  try {
    const [[existing]] = await conn.query(
      'SELECT id, name, surname FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    let userId;
    if (existing) {
      userId = existing.id;
      // Fill in missing name/surname if the user row lacks them
      if (!DRY_RUN && (!existing.name || !existing.surname)) {
        const updates = {};
        if (!existing.name    && firstName) updates.name    = firstName;
        if (!existing.surname && lastName)  updates.surname = lastName;
        if (Object.keys(updates).length) {
          const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
          await conn.query(
            `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
            [...Object.values(updates), userId],
          );
        }
      }
    } else {
      // Create a new user. They can reset their password via forgot-password.
      const tempPassword = crypto.randomBytes(9).toString('base64url');
      const passwordHash = await bcryptjs.hash(tempPassword, bcryptRounds);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (DRY_RUN) {
        console.log(`  #${submission_id}: would CREATE user — ${email} (${firstName} ${lastName})`);
        linked++;
        continue;
      }

      const [result] = await conn.query(
        `INSERT INTO users
           (email, password_hash, name, surname, role_id, is_active, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
        [email, passwordHash, firstName, lastName, userRoleId, now, now],
      );
      userId = result.insertId;
      created++;
      console.log(`  #${submission_id}: created user #${userId} — ${email}`);
    }

    if (DRY_RUN) {
      console.log(`  #${submission_id}: would link → user #${userId} (${email})`);
    } else {
      await conn.query(
        'UPDATE form_submissions SET user_id = ? WHERE id = ?',
        [userId, submission_id],
      );
      console.log(`  #${submission_id}: linked → user #${userId} (${email})`);
    }
    linked++;
  } catch (err) {
    console.error(`  #${submission_id}: ERROR — ${err.message}`);
    errors++;
  }
}

// ─── 9. Summary ───────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────');
console.log(`Submissions processed : ${submissions.length}`);
console.log(`  Linked             : ${linked}`);
console.log(`  Users created      : ${created}`);
console.log(`  Skipped (no email) : ${skippedNoEmail}`);
console.log(`  Errors             : ${errors}`);
if (DRY_RUN) console.log('\n(Dry run — nothing was written to the database.)');
console.log('─────────────────────────────────────────────────');

await conn.end();
