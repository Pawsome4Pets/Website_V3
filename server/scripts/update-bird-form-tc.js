// Adds the full T&C paragraph/subheading fields to the bird boarding form
// WITHOUT deleting existing fields (which would break submission_answers FKs).
//
// Strategy:
//   1. Find the bird boarding form and the position of the sec_boarding_tc section.
//   2. Shift all fields that come AFTER sec_boarding_tc forward by the number of
//      new fields being inserted.
//   3. Insert the new T&C fields between sec_boarding_tc and bt_name_first.
//   4. Update sec_boarding_tc's helpText to match the dog form.
//
// Idempotent: skips insertion of any fieldKey that already exists on this form.
//
// Usage:
//   cd server
//   node scripts/update-bird-form-tc.js --dry-run
//   node scripts/update-bird-form-tc.js

import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

// ─── Load .env.production ─────────────────────────────────────────────────────
const envPath = path.resolve('.env.production');
if (!fs.existsSync(envPath)) { console.error('✖ .env.production not found. Run from server/.'); process.exit(1); }
const prodEnv = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('='); let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);
if (!prodEnv.DATABASE_URL) { console.error('✖ DATABASE_URL missing.'); process.exit(1); }

// ─── Connect ──────────────────────────────────────────────────────────────────
console.log('\n→ Connecting…');
const conn = await mysql.createConnection({ uri: prodEnv.DATABASE_URL, dateStrings: true });
await conn.query('SELECT 1');
console.log('✓ Connected.');

// ─── Find form ────────────────────────────────────────────────────────────────
const [[form]] = await conn.query("SELECT id FROM forms WHERE slug = 'bird-boarding' LIMIT 1");
if (!form) { console.error('✖ bird-boarding form not found.'); process.exit(1); }
const FORM_ID = form.id;
console.log(`  Form id: ${FORM_ID}`);

// ─── Current fields ───────────────────────────────────────────────────────────
const [currentFields] = await conn.query(
  'SELECT id, field_key, position FROM form_fields WHERE form_id = ? ORDER BY position',
  [FORM_ID],
);
const byKey = Object.fromEntries(currentFields.map((f) => [f.field_key, f]));

const secField = byKey['sec_boarding_tc'];
if (!secField) { console.error('✖ sec_boarding_tc not found on this form.'); process.exit(1); }

const insertAfterPos = secField.position; // new fields go after this position

// ─── New T&C fields to insert (in order) ─────────────────────────────────────
const newFields = [
  { fieldKey: 'bt_h1', type: 'subheading', label: '1. Information',
    helpText: 'At Pawsome 4 Pets (PTY) LTD we strive in creating a home environment and a quality stay for each dog/bird. We cannot achieve these results if information provided by the client to us is incorrect.' },
  { fieldKey: 'bt_1_1', type: 'paragraph', label: 'Untitled',
    helpText: '1.1. I, the client understand that my dog/bird(s) wellbeing will be in jeopardy if I give incorrect or limited information to Pawsome 4 Pets (PTY) LTD.' },

  { fieldKey: 'bt_h2', type: 'subheading', label: '2. Vaccinations/Deworming/Tick & Flea', helpText: null },
  { fieldKey: 'bt_2_1',   type: 'paragraph', label: 'Untitled', helpText: '2.1. All adult dog(s) must have had vaccinations (5 in 1, Rabies and Kennel Cough) within the last 12 months prior to service being rendered.' },
  { fieldKey: 'bt_2_1_1', type: 'paragraph', label: 'Untitled', helpText: '2.1.1. Puppies must be up to date with vaccines as per Veterinarian’s prescription. Puppies must at least have had 2 vaccines prior to service being rendered.' },
  { fieldKey: 'bt_2_1_2', type: 'paragraph', label: 'Untitled', helpText: '2.1.2. A Veterinary Card / Inoculation Certificate / Veterinary Records must be provided with your booking. If failing to do so Pawsome 4 Pets (PTY) LTD may terminate the booking with full/partial/no refund. This will be handled with discretion by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_2_2',   type: 'paragraph', label: 'Untitled', helpText: '2.2. All dog(s) must be dewormed and have had treatment against ticks & fleas prior to services being rendered. Domestic dogs should be dewormed every 3 months. Tick and flea treatment should be up to date based on the product used.' },
  { fieldKey: 'bt_2_2_1', type: 'paragraph', label: 'Untitled', helpText: '2.2.1. Dog(s) will be screened for parasites upon arrival. If any parasites are visible, Pawsome 4 Pets (PTY) LTD may terminate the booking with full/partial/no refund. This will be handled with discretion by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_2_3',   type: 'paragraph', label: 'Untitled', helpText: '2.3. The client understand that all dog(s) should be up to date with vaccinations and parasitic control as our minimum requirement. Client agrees to indemnify and hold harmless Pawsome 4 Pets (PTY) LTD for any liability in the event of client’s dog(s) contracting (including but not limited to) diseases and or parasites.' },
  { fieldKey: 'bt_2_4',   type: 'paragraph', label: 'Untitled', helpText: '2.4. Client agrees to reimburse Pawsome 4 Pets (PTY) LTD for any costs incurred, including but not limited to, contracting out pest control for clearing of infestations, Medical- and veterinary care while our staff, resident dogs as well as boarding dogs were exposed to client’s dog(s). Client understands that a service agreement may be terminated with immediate effect by Pawsome 4 Pets (PTY) LTD in the event of observing any contagious disease / parasites upon arrival without a refund for the remaining days.' },

  { fieldKey: 'bt_h3', type: 'subheading', label: '3. Intact Male / Female dogs', helpText: null },
  { fieldKey: 'bt_3_1', type: 'paragraph', label: 'Untitled', helpText: '3.1. Any dog over the age of 6 months must be spayed / neutered.' },
  { fieldKey: 'bt_3_2', type: 'paragraph', label: 'Untitled', helpText: '3.2. Female dogs that are in their heat cycle will not be admitted for services. Up to 21 days after the heat (bleeding) cycle stops, the fertility period start. Pawsome 4 Pets (PTY) LTD reserve the right of admission and may terminate the booking with full/partial/no refund.' },
  { fieldKey: 'bt_3_3', type: 'paragraph', label: 'Untitled', helpText: '3.3. Male dogs that are intact will mount other dogs which causes distress amongst neutered males. Intact male dogs will not be admitted for services. Pawsome 4 Pets (PTY) LTD reserve the right of admission and may terminate the booking with full/partial/no refund.' },

  { fieldKey: 'bt_h4', type: 'subheading', label: '4. Aggression / Bad Behaviour', helpText: null },
  { fieldKey: 'bt_4_1', type: 'paragraph', label: 'Untitled', helpText: '4.1. Client will describe all incidents of aggression or any other behavioural issues to Pawsome 4 Pets (PTY) LTD. Pawsome 4 Pets (PTY) LTD reserve the right of admission related to aggressive dog(s) or dog(s) with behavioural issues.' },
  { fieldKey: 'bt_4_2', type: 'paragraph', label: 'Untitled', helpText: '4.2. Client understands that a service agreement may be terminated with immediate effect by Pawsome 4 Pets (PTY) LTD in the event of an aggressive episode without a refund for the remaining days.' },
  { fieldKey: 'bt_4_3', type: 'paragraph', label: 'Untitled', helpText: '4.3. Pawsome 4 Pets (PTY) LTD does not accept any aggressive dog(s). Client agrees to be responsible for all costs (including but not limited to) medical- and veterinary care, if a client’s dog(s) should bite and or injure our staff, personal dogs and dogs boarding at Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_4_4', type: 'paragraph', label: 'Untitled', helpText: '4.4. The client agrees to indemnify and hold harmless Pawsome 4 Pets (PTY) LTD from any liability resulting from injuries / damage / ailments inflicted / caused by their dog(s) on third parties and any injury suffered by their dog(s).' },

  { fieldKey: 'bt_h5', type: 'subheading', label: '5. Ailments and Injuries',
    helpText: 'Pawsome 4 Pets PTY LTD is a kennel-free environment. Our dog guests are thus not kept in kennels and are free to play, explore and be happy dogs in a natural environment. Dogs are in contact with humans and other dogs in a social setting. It is therefore important to realise that dogs may get (including but not limited to) small scrapes / insect bites / eye irritations from dust / chipped toenails / etc. We keep a strict hygiene policy with regards to sanitation as well as a safe and secure area. We boast with a disease free record for the last 10+ years.' },
  { fieldKey: 'bt_5_1', type: 'paragraph', label: 'Untitled', helpText: '5.1. I, the client understand that I cannot send a dog/bird with contagious disease into a social setting. If any diseases are visible, Pawsome 4 Pets (PTY) LTD may terminate the booking with full/partial/no refund. This will be handled with discretion by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_5_2', type: 'paragraph', label: 'Untitled', helpText: '5.2. Pawsome 4 Pets (PTY) LTD is released from all liability for loss of / or damage (including but not limited to) any veterinary expenses incurred in respect of the dog/bird(s), sickness, injury or escape, and loss / death at Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_5_3', type: 'paragraph', label: 'Untitled', helpText: '5.3. Pawsome 4 Pets (PTY) LTD is released from all liability related to the transportation of dog/bird(s) to and from any Veterinary Clinic, Emergency Veterinary Clinic, the medical treatment of the dog(s) and the expenses thereof.' },

  { fieldKey: 'bt_h6', type: 'subheading', label: '6. Medication', helpText: null },
  { fieldKey: 'bt_6_1', type: 'paragraph', label: 'Untitled', helpText: '6.1. Please provide Pawsome 4 Pets (PTY) LTD with the necessary medication and clear instructions on the administration of medications.' },
  { fieldKey: 'bt_6_2', type: 'paragraph', label: 'Untitled', helpText: '6.2. While our staff is trained in administering medication Pawsome 4 Pets (PTY) LTD cannot be held liable for any complications while administering medications to the dog(s).' },

  { fieldKey: 'bt_h7', type: 'subheading', label: '7. Belongings', helpText: null },
  { fieldKey: 'bt_7_1', type: 'paragraph', label: 'Untitled', helpText: '7.1. All birds must arrive in a secure travel cage or crate. Pawsome 4 Pets (PTY) LTD does not take any responsibility for birds that fly off or into on coming traffic.' },
  { fieldKey: 'bt_7_2', type: 'paragraph', label: 'Untitled', helpText: '7.2. The client is responsible to provide Pawsome 4 Pets (PTY) LTD with the necessary supplies needed for the care of their birds.\n\n  • Travel cage to stay in while in the care of Pawsome 4 Pets (PTY) LTD\n  • Medication / Supplements\n  • Properly fitted harness and lead / Traveling Crate.\n  • We advise that a night time blanket for our birdy guests comes along. It is something familiar from home.\n  • Our bird clients are welcome to bring bird toys to add to their travel cages as well as treats. We do also give treats (in season safe fruits).' },
  { fieldKey: 'bt_7_3', type: 'paragraph', label: 'Untitled', helpText: '7.3. All belongings / supplies should be marked / labelled clearly.' },
  { fieldKey: 'bt_7_4', type: 'paragraph', label: 'Untitled', helpText: '7.4. Pawsome 4 Pets (PTY) LTD is released from all liability for loss of / or damage (including but not limited to) to goods brought to / left at Pawsome 4 Pets (PTY) LTD.' },

  { fieldKey: 'bt_h8', type: 'subheading', label: '8. Admission / Collection', helpText: null },
  { fieldKey: 'bt_8_1', type: 'paragraph', label: 'Untitled', helpText: '8.1. Client understands that Pawsome 4 Pets (PTY) LTD is a home boarding facility and adhere to our trading hours in respect of our household and other boarding dogs/birds.\n\n  8.1.1. Pawsome 4 Pets (PTY) LTD trading hours are:\n    • Monday Wednesday & Friday: 09:30 – 11:00 & 15:30 – 17:00\n    • Tuesday, Thursday & Saturday: 10:00 – 11:00\n    • Sunday: 11:00 to 13:00\n    • Public Holidays (Excluding December 25th, December 26th, January 1st) – times are available upon request and on booking confirmation emails.\n\n  8.1.2. Pawsome 4 Pets (PTY) LTD hours for the festive season:\n    • December 24th – 10:00 – 11:00\n    • December 25th – CLOSED\n    • December 26th – 10:00 to 14:00\n    • January 1st – CLOSED' },
  { fieldKey: 'bt_8_2', type: 'paragraph', label: 'Untitled', helpText: '8.2. Client agrees that dog/bird(s) that are not collected before closing time on the day of departure without sufficient communication at least one (1) hour prior to closing time, will be kept and a penalty fee is payable upon collection. R200 per pet up until an hour after closing time and thereafter no pet shall leave until trading start on the following day with a full day and penalty fee per pet payable in cash upon collection of pets.' },
  { fieldKey: 'bt_8_3', type: 'paragraph', label: 'Untitled', helpText: '8.3. Client agrees that any dog/birds(s) that are not collected within seven (7) days after intended departure date may at the discretion of Pawsome 4 Pets (PTY) LTD be surrendered to any animal welfare society, in the event of no sufficient communication from the client.' },
  { fieldKey: 'bt_8_4', type: 'paragraph', label: 'Untitled', helpText: '8.4. Pawsome 4 Pets (PTY) LTD is released from all liability related to injuries by client(s) and / or dog/birds(s) that may occur at Pawsome 4 Pets (PTY) LTD and the expenses thereof.' },

  { fieldKey: 'bt_h9', type: 'subheading', label: '9. Payment and Cancellation', helpText: null },
  { fieldKey: 'bt_9_1',   type: 'paragraph', label: 'Untitled', helpText: '9.1. Payments:' },
  { fieldKey: 'bt_9_1_1', type: 'paragraph', label: 'Untitled', helpText: '9.1.1. A deposit of 50% of the original amount is payable within seven (7) days after receipt of quotation to secure service booking; failing to do so will result in your dog not having a booking.' },
  { fieldKey: 'bt_9_1_2', type: 'paragraph', label: 'Untitled', helpText: '9.1.2. The remaining 50% is payable on the day of admission. Payment can be made through EFT / Cash.' },
  { fieldKey: 'bt_9_1_3', type: 'paragraph', label: 'Untitled', helpText: '9.1.3. Please use the reference number as indicated on your invoice / booking confirmation. Failing to use a reference number will result in unallocated payments.' },
  { fieldKey: 'bt_9_1_4', type: 'paragraph', label: 'Untitled', helpText: '9.1.4. Proof of payments can be sent to info@pawsome4pets.co.za / bookings@pawsome4pets.co.za' },
  { fieldKey: 'bt_9_2',   type: 'paragraph', label: 'Untitled', helpText: '9.2. Cancelations of booked services at Pawsome 4 Pets (PTY) LTD will result in a payable cancelation fee:' },
  { fieldKey: 'bt_9_2_1', type: 'paragraph', label: 'Untitled', helpText: '9.2.1. If a booking is cancelled more than 7days prior to arrival, 75% of the deposit amount is refundable. The full amount can be kept as credit if the client wishes not to have a refund paid out.' },
  { fieldKey: 'bt_9_2_2', type: 'paragraph', label: 'Untitled', helpText: '9.2.2. If a booking is cancelled less than 7days prior to arrival, 50% of the deposit amount is refundable. 75% of the deposit amount can be kept as credit if the client wishes not to have a refund paid out.' },

  { fieldKey: 'bt_h10', type: 'subheading', label: '10. Updates', helpText: null },
  { fieldKey: 'bt_10_1', type: 'paragraph', label: 'Untitled', helpText: '10.1. Pawsome 4 Pets (PTY) LTD will give 1 update per day as and when time permits. During festive periods we might not be able to give one daily but will try our best to get to everyone.' },
  { fieldKey: 'bt_10_2', type: 'paragraph', label: 'Untitled', helpText: '10.2. Video calls will unfortunately not be accepted.' },
  { fieldKey: 'bt_10_3', type: 'paragraph', label: 'Untitled', helpText: '10.3. Please also look at our social media pages (Facebook / Instagram / Tiktok) for pictures and videos. @pawsome4pets' },

  { fieldKey: 'bt_h11', type: 'subheading', label: '11. Pictures / Videos', helpText: null },
  { fieldKey: 'bt_11_1', type: 'paragraph', label: 'Untitled', helpText: '11.1. Photos taken of dogs/birds at the Pawsome 4 Pets (PTY) LTD facilities are the property of Pawsome 4 Pets (PTY) LTD and may be used for marketing and social media activities.' },
  { fieldKey: 'bt_11_2', type: 'paragraph', label: 'Untitled', helpText: '11.2. I give permission for my dog/bird to be photographed/videotaped, and/or used in any advertising or for media purposes without prior approval by me. All such materials are the property of Pawsome 4 Pets (PTY) LTD.' },
];

// Skip any that already exist
const toInsert = newFields.filter((f) => !byKey[f.fieldKey]);
console.log(`  ${newFields.length} new fields defined; ${toInsert.length} to insert (${newFields.length - toInsert.length} already exist).`);

if (toInsert.length === 0) {
  console.log('✓ All T&C fields already present — nothing to do.');
  await conn.end();
  process.exit(0);
}

// ─── Shift positions ──────────────────────────────────────────────────────────
// Fields after sec_boarding_tc need to move forward by toInsert.length
const shiftFrom = insertAfterPos + 1;
console.log(`  Shifting ${currentFields.filter(f => f.position >= shiftFrom).length} fields by +${toInsert.length} (from position ${shiftFrom})`);

if (!DRY_RUN) {
  await conn.query(
    'UPDATE form_fields SET position = position + ? WHERE form_id = ? AND position >= ?',
    [toInsert.length, FORM_ID, shiftFrom],
  );
}

// ─── Insert new fields ────────────────────────────────────────────────────────
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
let insertPos = insertAfterPos + 1;

for (const f of toInsert) {
  console.log(`  Insert [${insertPos}] ${f.fieldKey} (${f.type})`);
  if (!DRY_RUN) {
    await conn.query(
      `INSERT INTO form_fields
         (form_id, field_key, label, type, help_text, is_required, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [FORM_ID, f.fieldKey, f.label, f.type, f.helpText ?? null, insertPos, now, now],
    );
  }
  insertPos++;
}

// ─── Update sec_boarding_tc helpText ─────────────────────────────────────────
const newIntro = 'We want your pet’s experience at Pawsome 4 Pets (PTY) LTD to be as pleasant and stress free as possible. It is important to understand that some pet(s) respond to new environments differently, even with the best efforts. We will make every effort to make it a positive experience.';
console.log('  Updating sec_boarding_tc helpText…');
if (!DRY_RUN) {
  await conn.query(
    'UPDATE form_fields SET help_text = ?, updated_at = ? WHERE form_id = ? AND field_key = ?',
    [newIntro, now, FORM_ID, 'sec_boarding_tc'],
  );
  // Also touch the form's updated_at
  await conn.query('UPDATE forms SET updated_at = ? WHERE id = ?', [now, FORM_ID]);
}

console.log('\n✓ Done.');
if (DRY_RUN) console.log('(Dry run — nothing written.)');

await conn.end();
