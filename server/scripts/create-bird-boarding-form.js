// Creates the "Pawsome 4 Pets Bird Boarding" form on prod. Modeled on the
// dog New Client Application form but trimmed for birds: no Rainbow
// Request, no Grooming T&Cs, bird-specific repeater sub-fields.
//
// Idempotent: if a form with slug "bird-boarding" already exists it just
// replaces the fields, doesn't create a duplicate form.
//
// Usage:
//   cd server
//   $env:PROD_URL = "https://website-v3-five-tawny.vercel.app"   # PowerShell
//   node scripts/create-bird-boarding-form.js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

// ─── Load prod creds ────────────────────────────────────────────────────────
const envPath = path.resolve('.env.production');
if (!fs.existsSync(envPath)) {
  console.error(`✖ ${envPath} not found. Run from server/.`);
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

const API = (process.env.PROD_URL || '').replace(/\/$/, '');
const EMAIL = prodEnv.ADMIN_EMAIL || 'admin@pawsome4pets.co.za';
const PASSWORD = prodEnv.ADMIN_PASSWORD;
const SLUG = 'bird-boarding';
const TITLE = 'Pawsome 4 Pets Bird Boarding';

if (!API) { console.error('✖ PROD_URL env var required.'); process.exit(1); }
if (!PASSWORD) { console.error('✖ ADMIN_PASSWORD missing from .env.production.'); process.exit(1); }

// ─── Field definition ──────────────────────────────────────────────────────
const fields = [
  // TAB 1 — Owner ──────────────────────────────────────────────────────────
  { fieldKey: 'sec_owner', type: 'section', label: 'Owner’s Information',
    helpText: 'Primary contact details for the bird’s owner.' },
  {
    fieldKey: 'owners', type: 'repeater', label: 'Owner', isRequired: true,
    options: {
      minInstances: 1, maxInstances: 4, addLabel: 'Add Owner',
      fields: [
        { fieldKey: 'sub_owner_name', type: 'subheading', label: 'Owner Name' },
        { fieldKey: 'first',     type: 'text',  label: 'First',                                isRequired: true },
        { fieldKey: 'last',      type: 'text',  label: 'Last',                                 isRequired: true },
        { fieldKey: 'id_number', type: 'text',  label: 'Identity Number',                      isRequired: true },
        { fieldKey: 'cell',      type: 'tel',   label: 'Cellphone Number',                     isRequired: true },
        { fieldKey: 'work',      type: 'tel',   label: 'Work / Alternative Contact Number',    isRequired: false },
        { fieldKey: 'email',     type: 'email', label: 'Email Address',                        isRequired: true },
        { fieldKey: 'email_sec', type: 'email', label: 'Secondary Email Address',              isRequired: false },
        { fieldKey: 'addr1',     type: 'text',  label: 'Address Line 1',                       isRequired: true },
        { fieldKey: 'addr2',     type: 'text',  label: 'Address Line 2',                       isRequired: false },
        { fieldKey: 'city',      type: 'text',  label: 'City',                                 isRequired: true },
        { fieldKey: 'province',  type: 'text',  label: 'State / Province / Region',            isRequired: true },
        { fieldKey: 'postal',    type: 'text',  label: 'Postal / Zip Code',                    isRequired: true },
        { fieldKey: 'how_heard', type: 'radio', label: 'How did you hear about us?',           isRequired: false,
          options: ['Facebook', 'Google', 'Referral'] },
      ],
    },
  },

  // TAB 2 — Emergency contact ────────────────────────────────────────────
  { fieldKey: 'sec_emerg', type: 'section', label: 'Emergency Contact Person',
    helpText: 'In case we cannot reach the primary owner.' },
  {
    fieldKey: 'emergency_contacts', type: 'repeater', label: 'Emergency Contact', isRequired: true,
    options: {
      minInstances: 1, maxInstances: 5, addLabel: 'Add Emergency Contact',
      fields: [
        { fieldKey: 'sub_emerg_name', type: 'subheading', label: 'Name' },
        { fieldKey: 'first',          type: 'text',  label: 'First',                              isRequired: true },
        { fieldKey: 'last',           type: 'text',  label: 'Last',                               isRequired: true },
        { fieldKey: 'relationship',   type: 'text',  label: 'Relationship to owner',              isRequired: true },
        { fieldKey: 'authorized',     type: 'radio', label: 'Authorized to Collect/Drop off',     isRequired: true, options: ['Yes', 'No'] },
        { fieldKey: 'cell',           type: 'tel',   label: 'Cellphone Number',                   isRequired: true },
        { fieldKey: 'email',          type: 'email', label: 'Email Address',                      isRequired: true },
        { fieldKey: 'addr1',          type: 'text',  label: 'Address Line 1',                     isRequired: true },
        { fieldKey: 'addr2',          type: 'text',  label: 'Address Line 2',                     isRequired: false },
        { fieldKey: 'city',           type: 'text',  label: 'City',                               isRequired: true },
        { fieldKey: 'province',       type: 'text',  label: 'State / Province / Region',          isRequired: true },
        { fieldKey: 'postal',         type: 'text',  label: 'Postal / Zip Code',                  isRequired: true },
      ],
    },
  },

  // TAB 3 — Bird ─────────────────────────────────────────────────────────
  { fieldKey: 'sec_bird', type: 'section', label: 'Bird’s Information',
    helpText: 'Tell us about each of your birds. Click "Add Bird" to add another.' },
  {
    fieldKey: 'birds', type: 'repeater', label: 'Bird', isRequired: true,
    options: {
      minInstances: 1, maxInstances: 10, addLabel: 'Add Bird',
      fields: [
        { fieldKey: 'name',        type: 'text', label: 'Bird’s Name', isRequired: true },
        { fieldKey: 'dob',         type: 'date', label: 'Date of Birth', isRequired: false },
        { fieldKey: 'breed',       type: 'text', label: 'Breed / Species', isRequired: true },
        { fieldKey: 'sex',         type: 'radio', label: 'Sex', isRequired: false,
          options: ['Male', 'Female', 'Unknown'] },
        { fieldKey: 'has_insurance', type: 'radio', label: 'Does your bird have Medical Aid/Pet Insurance',
          isRequired: false, options: ['Yes', 'No'] },
        { fieldKey: 'insurance_provider', type: 'text', label: 'Service Provider', isRequired: false },
        { fieldKey: 'insurance_plan',     type: 'text', label: 'Insurance Plan',   isRequired: false },
        { fieldKey: 'insurance_policy',   type: 'text', label: 'Policy Number',    isRequired: false },
        { fieldKey: 'has_ring',    type: 'radio', label: 'Does your bird have an Identification Ring',
          isRequired: false, options: ['Yes', 'No'] },
        { fieldKey: 'ring_number', type: 'text', label: 'Ring Number', isRequired: false },
        { fieldKey: 'disabilities',         type: 'textarea', label: 'Disabilities', isRequired: false },
        { fieldKey: 'health_conditions',    type: 'textarea', label: 'Health Conditions', isRequired: false },
        { fieldKey: 'disease_exposure',     type: 'textarea', label: 'Recent Exposure to Diseases', isRequired: false },
        { fieldKey: 'medication',           type: 'textarea', label: 'Medication', isRequired: false },
        { fieldKey: 'dislikes',             type: 'textarea', label: 'Dislikes', isRequired: false },
        { fieldKey: 'usual_food_brand',     type: 'text', label: 'Usual Food Brand', isRequired: false },
        { fieldKey: 'food_servings_per_day', type: 'text', label: 'Food Servings Per Day', isRequired: false },
        { fieldKey: 'food_servings_detail',  type: 'textarea',
          label: 'Describe all food servings and amounts', isRequired: false },
      ],
    },
  },

  // TAB 4 — Urgent Vet Auth ──────────────────────────────────────────────
  { fieldKey: 'sec_vet_auth', type: 'section', label: 'Urgent Veterinary Authorisation',
    helpText: 'Person responsible for veterinary bills. Must be over 18.' },
  { fieldKey: 'vet_owner_first', type: 'text', label: 'First', isRequired: true },
  { fieldKey: 'vet_owner_last',  type: 'text', label: 'Last',  isRequired: true },
  { fieldKey: 'vet_owner_id',    type: 'text', label: 'Identity Number', isRequired: true },
  { fieldKey: 'vet_owner_phone1', type: 'tel', label: 'Owner’s Contact Number', isRequired: true },
  { fieldKey: 'vet_owner_phone2', type: 'tel', label: 'Owner’s Contact Number', isRequired: false },
  { fieldKey: 'vet_owner_email', type: 'email', label: 'Email', isRequired: true },
  { fieldKey: 'vet_addr1',    type: 'text', label: 'Address Line 1', isRequired: true },
  { fieldKey: 'vet_addr2',    type: 'text', label: 'Address Line 2', isRequired: false },
  { fieldKey: 'vet_city',     type: 'text', label: 'City', isRequired: true },
  { fieldKey: 'vet_province', type: 'text', label: 'State / Province / Region', isRequired: true },
  { fieldKey: 'vet_postal',   type: 'text', label: 'Postal / Zip Code', isRequired: true },
  { fieldKey: 'vet_birds_names', type: 'text', label: 'Bird(s) Name', isRequired: true },
  { fieldKey: 'vet_regular_clinic', type: 'text', label: 'Regular Veterinary Clinic', isRequired: true },
  { fieldKey: 'vet_regular_clinic_phone', type: 'tel', label: 'Contact Number of Regular Veterinary Clinic', isRequired: true },
  { fieldKey: 'vet_max_cost', type: 'text', label: 'Veterinary costs may not exceed', isRequired: true,
    placeholder: 'R5,000.00' },
  { fieldKey: 'vet_agree', type: 'checkbox',
    label: 'I have read, understood and accept the above-mentioned Urgent Veterinary Authorisation as outlined by Pawsome 4 Pets (PTY) LTD. I Agree.',
    isRequired: true },
  { fieldKey: 'vet_signature', type: 'text', label: 'Signature', isRequired: true },

  // TAB 5 — Boarding T&Cs ───────────────────────────────────────────────
  { fieldKey: 'sec_boarding_tc', type: 'section', label: 'Boarding Terms, Conditions and Indemnities',
    helpText: 'Standard boarding agreement.' },
  { fieldKey: 'bt_name_first', type: 'text', label: 'First', isRequired: true },
  { fieldKey: 'bt_name_last',  type: 'text', label: 'Last',  isRequired: true },
  { fieldKey: 'bt_agree', type: 'checkbox',
    label: 'I have read, understood and accept the above-mentioned Terms, Conditions & Indemnities as outlined by Pawsome 4 Pets (PTY) LTD. I Agree.',
    isRequired: true },
  { fieldKey: 'bt_signature', type: 'text', label: 'Signature', isRequired: true },

  // TAB 6 — Booking ─────────────────────────────────────────────────────
  { fieldKey: 'sec_booking', type: 'section', label: 'Booking Requirements' },
  { fieldKey: 'svc_boarding', type: 'radio', label: 'Boarding (Sleep Over)',
    isRequired: false, options: ['No', 'Yes'] },
  { fieldKey: 'svc_daycare',  type: 'radio', label: 'Daycare (Drop off 09:30, Collection 17:00)',
    isRequired: false, options: ['No', 'Yes'] },
  { fieldKey: 'arrival_date',   type: 'date', label: 'Date of Arrival (Check In)', isRequired: false },
  { fieldKey: 'arrival_time',   type: 'text', label: 'Estimate Time of Arrival (Please see Trading Hours)', isRequired: false },
  { fieldKey: 'departure_date', type: 'date', label: 'Date of Departure (Check Out)', isRequired: false },
  { fieldKey: 'departure_time', type: 'text', label: 'Estimate Time of Departure (Please see Trading Hours)', isRequired: false },
];

// ─── Run ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`→ Logging in to ${API} as ${EMAIL}…`);
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
  const token = loginJson.token;
  console.log('✓ Authenticated.');

  const list = await (await fetch(`${API}/api/admin/forms`, { headers: { Authorization: `Bearer ${token}` } })).json();
  let form = list.forms?.find((f) => f.slug === SLUG);

  if (!form) {
    console.log(`→ Creating form "${TITLE}"…`);
    const created = await (await fetch(`${API}/api/admin/forms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: TITLE, slug: SLUG }),
    })).json();
    if (created.error) throw new Error(`Create failed: ${JSON.stringify(created)}`);
    form = created.form;
    console.log(`✓ Created (id ${form.id}).`);
  } else {
    console.log(`✓ Form "${TITLE}" already exists (id ${form.id}). Replacing fields.`);
  }

  console.log(`→ Saving ${fields.length} fields…`);
  const saved = await (await fetch(`${API}/api/admin/forms/${form.id}/fields`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })).json();
  if (saved.error) throw new Error(`Field save failed: ${JSON.stringify(saved)}`);
  console.log(`✓ Saved ${saved.form.fields.length} fields.`);

  await (await fetch(`${API}/api/admin/forms/${form.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: TITLE,
      isPublished: true,
      createsAccount: true,
      successMessage: 'Thank you! We’ve received your bird boarding application and will follow up shortly.',
    }),
  })).json();

  console.log('\nForm ready: ' + API + '/forms/' + form.slug);
  console.log('Admin:      ' + API + '/admin/forms/' + form.id);
}

main().catch((err) => { console.error(err); process.exit(1); });
