// Two tasks in one script:
//
// 1. Fix bird form (id=4): set label on every paragraph field that still has
//    label='Untitled', derived from the leading clause number in help_text.
//
// 2. Import 11 Additional Dogs submissions from the two Cognito Excel exports.
//    Excel data is read from additional_dogs_data.json (produced by Python).
//    Maps each row to the additional-dog-application form (form_id=5) and
//    inserts form_submissions + submission_answers rows.
//    Uses ip_address='cognito:vN#ID' as the idempotency key.
//
// Usage (run from server/ directory):
//   node scripts/fix-bird-labels-and-import-additional-dogs.js --dry-run
//   node scripts/fix-bird-labels-and-import-additional-dogs.js

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import bcryptjs from 'bcryptjs';

const DRY_RUN = process.argv.includes('--dry-run');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);

// ─── 1. Load .env.production ──────────────────────────────────────────────────
const envPath = path.resolve('.env.production');
if (!fs.existsSync(envPath)) { console.error('✖ .env.production not found'); process.exit(1); }
const prodEnv = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('='); let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    })
);

// ─── 2. Connect ───────────────────────────────────────────────────────────────
console.log('\n→ Connecting…');
const conn = await mysql.createConnection({ uri: prodEnv.DATABASE_URL, dateStrings: false, multipleStatements: false });
await conn.query('SELECT 1');
console.log('✓ Connected.');

// ─── 3. Fix bird form labels ──────────────────────────────────────────────────
console.log('\n─── Part 1: Fix bird form paragraph labels ───────────────────────');
const [[birdForm]] = await conn.query("SELECT id FROM forms WHERE slug='bird-boarding'");
const [untitled] = await conn.query(
  "SELECT id, field_key, help_text FROM form_fields WHERE form_id=? AND label='Untitled' ORDER BY position",
  [birdForm.id]
);
console.log(`Found ${untitled.length} untitled fields.`);
let labelFixed = 0;
for (const f of untitled) {
  const m = (f.help_text || '').match(/^(\d+(?:\.\d+)*\.?)/);
  const newLabel = m ? `Clause ${m[1]}` : f.field_key;
  if (!DRY_RUN) {
    await conn.query('UPDATE form_fields SET label=? WHERE id=?', [newLabel, f.id]);
  }
  console.log(`  ${DRY_RUN ? '[dry]' : '✓'} ${f.field_key} → "${newLabel}"`);
  labelFixed++;
}
console.log(`Labels fixed: ${labelFixed}`);

// ─── 4. Load Excel JSON ───────────────────────────────────────────────────────
console.log('\n─── Part 2: Import Additional Dogs submissions ────────────────────');
const jsonPath = path.resolve('..', '..', '..', 'additional_dogs_data.json');
// Fallback paths
const candidates = [
  jsonPath,
  path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'additional_dogs_data.json'),
  'C:/Users/jouma/Downloads/additional_dogs_data.json',
];
let xlData;
for (const p of candidates) {
  if (fs.existsSync(p)) { xlData = JSON.parse(fs.readFileSync(p, 'utf8')); break; }
}
if (!xlData) { console.error('✖ additional_dogs_data.json not found. Run the Python export first.'); process.exit(1); }
console.log(`Loaded Excel JSON: v1=${xlData.v1.rows.length} rows, v2=${xlData.v2.rows.length} rows`);

// ─── 5. Load additional-dogs form fields ──────────────────────────────────────
const [[addForm]] = await conn.query("SELECT id FROM forms WHERE slug='additional-dog-application'");
if (!addForm) { console.error('✖ additional-dog-application form not found'); process.exit(1); }
console.log(`Additional dogs form id: ${addForm.id}`);

const [formFields] = await conn.query('SELECT id, field_key FROM form_fields WHERE form_id=?', [addForm.id]);
const fieldByKey = Object.fromEntries(formFields.map(f => [f.field_key, f.id]));

// ─── 6. Row → answer map ──────────────────────────────────────────────────────
// Column layout:
//   0   cognitoId
//   1   firstName (owner)         → ad_owner_first
//   2   lastName  (owner)         → ad_owner_last
//   3   identityNumber            → ad_owner_id
//   4   rr_applies
//   5   rr_dog_name
//   6   rr_owner_first
//   7   rr_owner_last
//   8   rr_cellphone
//   9   rr_email
//   10  rr_emergency_name
//   11  rr_emergency_phone
//   12  rrWish1 text (emergency contact)
//   13  rrWish1 rating
//   14  rrWish2 text (ashes returned)
//   15  rrWish2 rating
//   16  rrWish3 text (no ashes)
//   17  rrWish3 rating
//   18  rr_notify_timing
//   19  rr_agree
//   20  rr_signature
//   21  vet_owner_first
//   22  vet_owner_last
//   23  vet_owner_id
//   24  vet_owner_phone1
//   25  vet_owner_email           → also ad_owner_email
//   26  vet_addr1
//   27  vet_addr2
//   28  vet_city
//   29  vet_province
//   30  vet_postal
//   31  vet_dogs_names
//   32  vet_regular_clinic
//   33  vet_regular_clinic_phone
//   [v1 extra: 34=hasInsurance, 35=insurer, 36=policy, 37=plan]
//   34(v2)/38(v1)  vet_max_cost
//   35(v2)/39(v1)  vet_agree
//   36(v2)/40(v1)  vet_signature
//   37(v2)/41(v1)  bt_name_first
//   38(v2)/42(v1)  bt_name_last
//   39(v2)/43(v1)  bt_agree
//   40(v2)/44(v1)  bt_signature
//   41(v2)/45(v1)  gt_name_first
//   42(v2)/46(v1)  gt_name_last
//   43(v2)/47(v1)  gt_agree
//   44(v2)/48(v1)  gt_signature
//   45(v2)/49(v1)  status
//   46(v2)/50(v1)  dateCreated
//   47(v2)/51(v1)  dateSubmitted
//   48(v2)/52(v1)  dateUpdated

function rowToAnswers(row, isV1) {
  const o = isV1 ? 4 : 0; // column offset due to 4 extra insurance cols in v1

  let rrWishes = null;
  if (row[12]) rrWishes = 'I want my emergency contact to be called and to pick up my pet if they pass away – (However, if my emergency contact is unreachable, I understand that Pawsome 4 Pets (PTY) LTD will transport my pet to my Veterinary Clinic (if within 10km from P4P) or to nearest available Veterinary Clinic. I understand that it will be added to my bill.';
  else if (row[14]) rrWishes = 'I authorize Pawsome 4 Pets (PTY) LTD to transport my pet to my Veterinary Clinic (if within 10km from P4P) or to the nearest available Veterinary Clinic for cremation and wish TO HAVE my pet’s ashes returned. I understand that it will be added to my bill.';
  else if (row[16]) rrWishes = 'I authorize Pawsome 4 Pets (PTY) LTD to transport my pet to my Veterinary Clinic (if within 10km from P4P) or to the nearest available Veterinary Clinic for cremation and DO NOT wish to have my pet’s ashes returned. I understand that it will be added to my bill.';

  const maxCostRaw = row[34 + o];
  const vetMaxCost = maxCostRaw ? `R${Number(maxCostRaw).toLocaleString('en-ZA')},00` : null;

  const submittedRaw = row[47 + o]; // dateSubmitted col
  const submittedAt = submittedRaw ? new Date(submittedRaw) : new Date();

  return {
    email: (row[25] || '').toLowerCase().trim(),
    submittedAt,
    answers: {
      ad_owner_first: row[1],
      ad_owner_last:  row[2],
      ad_owner_id:    row[3],
      ad_owner_email: row[25],
      ad_owner_phone: row[24],

      rr_applies:         row[4],
      rr_dog_name:        row[5],
      rr_owner_first:     row[6],
      rr_owner_last:      row[7],
      rr_cellphone:       row[8],
      rr_email:           row[9],
      rr_emergency_name:  row[10],
      rr_emergency_phone: row[11],
      rr_wishes:          rrWishes,
      rr_notify_timing:   row[18],
      rr_agree:           row[19],
      rr_signature:       row[20],

      vet_owner_first:          row[21],
      vet_owner_last:           row[22],
      vet_owner_id:             row[23],
      vet_owner_phone1:         row[24],
      vet_owner_email:          row[25],
      vet_addr1:                row[26],
      vet_addr2:                row[27],
      vet_city:                 row[28],
      vet_province:             row[29],
      vet_postal:               row[30],
      vet_dogs_names:           row[31],
      vet_regular_clinic:       row[32],
      vet_regular_clinic_phone: row[33],
      vet_max_cost:             vetMaxCost,
      vet_agree:                row[35 + o],
      vet_signature:            row[36 + o],

      bt_name_first: row[37 + o],
      bt_name_last:  row[38 + o],
      bt_agree:      row[39 + o],
      bt_signature:  row[40 + o],

      gt_name_first: row[41 + o],
      gt_name_last:  row[42 + o],
      gt_agree:      row[43 + o],
      gt_signature:  row[44 + o],
    },
  };
}

// ─── 7. User role ─────────────────────────────────────────────────────────────
const [[userRole]] = await conn.query("SELECT id FROM roles WHERE name='user' LIMIT 1");
const userRoleId = userRole?.id ?? null;
const bcryptRounds = Number(prodEnv.BCRYPT_ROUNDS || 12);

// ─── 8. Import rows ───────────────────────────────────────────────────────────
const allRows = [
  ...xlData.v1.rows.map(r => ({ row: r, isV1: true,  source: 'v1' })),
  ...xlData.v2.rows.map(r => ({ row: r, isV1: false, source: 'v2' })),
];
console.log(`\nRows to process: ${allRows.length}`);

let imported = 0, skipped = 0, errors = 0;

for (const { row, isV1, source } of allRows) {
  const cognitoId = row[0];
  const ipRef = `cognito:${source}#${cognitoId}`;

  // Idempotency: we store the cognito ref in ip_address
  const [already] = await conn.query(
    'SELECT id FROM form_submissions WHERE form_id=? AND ip_address=?',
    [addForm.id, ipRef]
  );
  if (already.length > 0) {
    console.log(`  ${source}#${cognitoId}: already imported → submission #${already[0].id}, skipping`);
    skipped++;
    continue;
  }

  const { email, submittedAt, answers } = rowToAnswers(row, isV1);
  if (!email) { console.log(`  ${source}#${cognitoId}: no email — skipped`); skipped++; continue; }

  try {
    // Find or create user
    const [[existingUser]] = await conn.query('SELECT id, name, surname FROM users WHERE email=? LIMIT 1', [email]);
    let userId;
    if (existingUser) {
      userId = existingUser.id;
      // Fill in missing name/surname
      if (!DRY_RUN && (!existingUser.name || !existingUser.surname)) {
        const updates = {};
        if (!existingUser.name    && answers.ad_owner_first) updates.name    = answers.ad_owner_first;
        if (!existingUser.surname && answers.ad_owner_last)  updates.surname = answers.ad_owner_last;
        if (Object.keys(updates).length) {
          const setClauses = Object.keys(updates).map(k => `${k}=?`).join(', ');
          await conn.query(`UPDATE users SET ${setClauses}, updated_at=NOW() WHERE id=?`, [...Object.values(updates), userId]);
        }
      }
    } else if (DRY_RUN) {
      console.log(`  ${source}#${cognitoId}: would CREATE user ${email}`);
      userId = 0;
    } else {
      const tempPw = crypto.randomBytes(9).toString('base64url');
      const hash = await bcryptjs.hash(tempPw, bcryptRounds);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [ins] = await conn.query(
        `INSERT INTO users (email, password_hash, name, surname, role_id, is_active, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
        [email, hash, answers.ad_owner_first, answers.ad_owner_last, userRoleId, now, now]
      );
      userId = ins.insertId;
      console.log(`  ${source}#${cognitoId}: created user #${userId} ${email}`);
    }

    const ts = submittedAt.toISOString().slice(0, 19).replace('T', ' ');

    if (DRY_RUN) {
      const answerCount = Object.values(answers).filter(v => v != null && v !== '').length;
      console.log(`  ${source}#${cognitoId}: would INSERT submission for ${email} at ${ts} (${answerCount} answers)`);
      imported++;
      continue;
    }

    // Insert submission
    const [subResult] = await conn.query(
      `INSERT INTO form_submissions (form_id, user_id, status, ip_address, user_agent, created_at, updated_at)
       VALUES (?, ?, 'submitted', ?, 'Imported from Cognito Forms', ?, ?)`,
      [addForm.id, userId || null, ipRef, ts, ts]
    );
    const submissionId = subResult.insertId;

    // Insert answers
    const answerRows = [];
    for (const [key, val] of Object.entries(answers)) {
      if (val == null || val === '') continue;
      const fieldId = fieldByKey[key];
      if (!fieldId) continue;
      answerRows.push([submissionId, fieldId, String(val).slice(0, 10000)]);
    }
    if (answerRows.length > 0) {
      await conn.query('INSERT INTO submission_answers (submission_id, field_id, value) VALUES ?', [answerRows]);
    }

    console.log(`  ${source}#${cognitoId}: ✓ submission #${submissionId} ${email} (${answerRows.length} answers)`);
    imported++;
  } catch (err) {
    console.error(`  ${source}#${cognitoId}: ERROR — ${err.message}`);
    errors++;
  }
}

// ─── 9. Summary ───────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────');
console.log(`Part 1 – Bird labels fixed   : ${labelFixed}`);
console.log(`Part 2 – Submissions imported: ${imported}`);
console.log(`         Skipped             : ${skipped}`);
console.log(`         Errors              : ${errors}`);
if (DRY_RUN) console.log('\n(Dry run — nothing written to database.)');
console.log('─────────────────────────────────────────────────');

await conn.end();
