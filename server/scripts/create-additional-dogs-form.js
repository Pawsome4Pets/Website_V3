// Creates the "Additional Dog Application Form" for existing Pawsome 4 Pets clients.
// Used when a client already has a New Client Application on file and wants to
// register additional dogs. Skips the Owner and Emergency Contact repeaters
// (already on file) but keeps everything else: Dog Info, Rainbow Request,
// Urgent Vet Auth, full Boarding T&Cs, full Grooming T&Cs, and Booking Details.
//
// Usage (run from the server/ directory):
//   node scripts/create-additional-dogs-form.js
//
// If the form already exists (slug match) it is replaced entirely.
// To target a non-local API, set API_URL in your environment:
//   API_URL=https://website-v3-five-tawny.vercel.app node scripts/create-additional-dogs-form.js
import 'dotenv/config';

const API = process.env.API_URL || 'http://localhost:4000';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@pawsome4pets.co.za';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Andy@2020';
const SLUG = 'additional-dog-application';

const showWhen = (key, val) => [
  { dependsOnKey: key, operator: 'equals', value: val, action: 'show' },
  { dependsOnKey: key, operator: 'notEquals', value: val, action: 'hide' },
];
const requireWhen = (key, val) => [
  ...showWhen(key, val),
  { dependsOnKey: key, operator: 'equals', value: val, action: 'require' },
];

const fields = [
  // ════════════════════════════════════════════════════════════════════════════
  // OWNER IDENTIFICATION — lightweight; full record is on file from initial form
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_owner', type: 'section', label: 'Owner Identification',
    helpText: 'Please confirm your details so we can match this application to your existing client profile.' },

  { fieldKey: 'ad_owner_first', type: 'text',  label: 'First Name',       isRequired: true },
  { fieldKey: 'ad_owner_last',  type: 'text',  label: 'Last Name',        isRequired: true },
  { fieldKey: 'ad_owner_id',   type: 'text',  label: 'Identity Number',   isRequired: true },
  { fieldKey: 'ad_owner_email', type: 'email', label: 'Email Address',    isRequired: true },
  { fieldKey: 'ad_owner_phone', type: 'tel',   label: 'Cellphone Number', isRequired: true, placeholder: 'Phone (International)' },

  // ════════════════════════════════════════════════════════════════════════════
  // DOG'S INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_dog', type: 'section', label: 'Dog’s Information',
    helpText: 'Tell us about each dog you are registering. Click “Add Dog” to add another.' },

  {
    fieldKey: 'dogs',
    type: 'repeater',
    label: 'Dog',
    isRequired: true,
    options: {
      minInstances: 1,
      maxInstances: 5,
      addLabel: 'Add Dog',
      fields: [
        { fieldKey: 'name',         type: 'text', label: 'Dog’s Name',    isRequired: true },
        { fieldKey: 'dob',          type: 'date', label: 'Date of Birth', isRequired: true },
        { fieldKey: 'breed',        type: 'text', label: 'Breed',         isRequired: true },
        { fieldKey: 'picture',      type: 'file', label: 'Picture',       isRequired: true,
          helpText: 'Upload or drag files here.' },
        { fieldKey: 'sex',          type: 'radio', label: 'Sex', isRequired: true, options: ['Male', 'Female'] },
        { fieldKey: 'sterilised',   type: 'radio', label: 'Spayed/Neutered?', isRequired: true,
          options: ['Yes', 'No'],
          helpText: 'Male/Female dogs over 6 months should be Spayed/Neutered. We do not take intact dogs.' },
        { fieldKey: 'has_insurance', type: 'radio', label: 'Does your dog have Medical Aid/Pet Insurance',
          isRequired: false, options: ['Yes', 'No'] },
        { fieldKey: 'vaccination_records', type: 'file', label: 'Deworming and Vaccination Records', isRequired: true,
          helpText: 'Please upload a picture of Vaccine Records or ask your Veterinary Clinic for a copy of the Medical Report. All dogs should have updated 5 in 1, Rabies and Kennel Cough vaccines.' },
        { fieldKey: 'identification', type: 'radio', label: 'Does your dog have identification', isRequired: true,
          options: ['Microchip', 'Tag', 'None'] },
        { fieldKey: 'tick_flea', type: 'radio', label: 'Tick and Flea Treatment', isRequired: true,
          options: ['Bravecto', 'NexGard', 'Tick & Flea Collar', 'Spot-on Drops', 'Grooming Dip'] },
        { fieldKey: 'disabilities', type: 'textarea', label: 'Disabilities', isRequired: true,
          helpText: 'Any form of PHYSICAL impairments (Limping/Blindness/Deafness etc)' },
        { fieldKey: 'health_conditions', type: 'textarea', label: 'Health Conditions', isRequired: true,
          helpText: 'Please indicate ALL Chronic Health conditions' },
        { fieldKey: 'disease_exposure', type: 'textarea', label: 'Recent Exposure to Diseases', isRequired: true,
          helpText: 'Please indicate ALL diseases' },
        { fieldKey: 'medication', type: 'textarea', label: 'Medication', isRequired: true,
          helpText: 'Eg. Medicine: Breakfast/Lunch/Dinner - Dosage (1/2 Tablet/0.5ml etc)' },
        { fieldKey: 'allergies', type: 'textarea', label: 'Allergies', isRequired: true,
          helpText: 'Please indicate ALL KNOWN allergies (Food/Natural/Grooming related)' },
        { fieldKey: 'usual_food_brand', type: 'text', label: 'Usual Food Brand', isRequired: true },
        { fieldKey: 'food_servings', type: 'checkbox', label: 'Food Servings Per Day', isRequired: true,
          options: ['Breakfast', 'Lunch', 'Dinner'] },
        { fieldKey: 'food_amount', type: 'text', label: 'Amount of food per serving', isRequired: true,
          helpText: 'Eg. 50g OR 1x Cup (Please provide the cup)' },

        { fieldKey: 'note_dry_food', type: 'paragraph', label: 'Dry Food',
          helpText: 'Pawsome 4 Pets wish to not disrupt a dog’s diet for a short period on short notice. We therefore suggest food to come from home. Failure to bring food from home will result in additional charges per dog per day.' },
        { fieldKey: 'note_raw_food', type: 'paragraph', label: 'Raw/Cooked Food',
          helpText: 'Pawsome 4 Pets suggest that Raw/Cooked meals should be pre-packaged in single servings. A plastic Zip Lock bag is perfect for single servings.' },

        { fieldKey: 'sec_behaviour', type: 'subheading', label: 'Behavior',
          helpText: 'Please rate each item below as Bad, Average or Good.' },
        { fieldKey: 'social_humans', type: 'radio', label: 'How is my socialising with strange humans?', isRequired: true,
          options: ['Bad', 'Average', 'Good'] },
        { fieldKey: 'social_dogs', type: 'radio', label: 'How is my behaviour with strange dogs?', isRequired: true,
          options: ['Bad', 'Average', 'Good'] },
        { fieldKey: 'social_weather', type: 'radio', label: 'How is my behaviour when it comes to bad weather or Fireworks?', isRequired: true,
          options: ['Bad', 'Average', 'Good'] },
        { fieldKey: 'food_aggression', type: 'radio', label: 'Am I food aggressive?', isRequired: false,
          options: ['Yes', 'No'] },
        { fieldKey: 'aggression_notes', type: 'textarea',
          label: 'Did your dog show any signs of agressive behavior in the past? Please elaborate',
          isRequired: true },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RAINBOW REQUEST
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_rainbow', type: 'section', label: 'Rainbow Request',
    helpText: 'For our Senior 8+ years and/or Special Needs dogs' },

  { fieldKey: 'rr_applies', type: 'radio',
    label: 'Does your dog suffer with: - Disabilities/Special Needs - Chronic Medical Conditions - Over the age of 8 Years',
    isRequired: true, options: ['Yes', 'No'] },

  { fieldKey: 'rr_dog_name',        type: 'text',  label: 'Dog’s Name',           isRequired: false, conditions: requireWhen('rr_applies', 'Yes') },
  { fieldKey: 'rr_owner_first',     type: 'text',  label: 'First',                      isRequired: false, conditions: requireWhen('rr_applies', 'Yes') },
  { fieldKey: 'rr_owner_last',      type: 'text',  label: 'Last',                       isRequired: false, conditions: requireWhen('rr_applies', 'Yes') },
  { fieldKey: 'rr_cellphone',       type: 'tel',   label: 'Cellphone Number',           isRequired: false, conditions: requireWhen('rr_applies', 'Yes'), placeholder: 'Phone (International)' },
  { fieldKey: 'rr_email',           type: 'email', label: 'Email Address',              isRequired: false, conditions: requireWhen('rr_applies', 'Yes') },
  { fieldKey: 'rr_emergency_name',  type: 'text',  label: 'Emergency Contact Person',   isRequired: false, conditions: requireWhen('rr_applies', 'Yes') },
  { fieldKey: 'rr_emergency_phone', type: 'tel',   label: 'Emergency Contact Number',   isRequired: false, conditions: requireWhen('rr_applies', 'Yes'), placeholder: 'Phone (International)' },

  { fieldKey: 'rr_intro', type: 'paragraph',
    helpText: 'Pawsome 4 Pets (PTY) LTD would like to keep our Rainbow Request form on file for our senior (8+ years) and/or our special needs dogs or dogs with a medical/physical condition that could possibly be life threatening.\n\nThis is a precautionary measure to assist us in following your wishes in the unlikely event your pet passes away while in our care. You can provide is with an emergency contact who will assume the responsibility to pick up your loved one and follow through on your arrangements or you can give Pawsome 4 Pets (PTY) LTD the responsibility of making arrangements for your pet at your nearest Veterinary clinic (if within 10km from Pawsome 4 Pets (PTY) LTD) and we will arrange transportation there. If the clinic is further than 10km away I understand that Pawsome 4 Pets (PTY) LTD will make use of the closest available Veterinary Clinic.',
    conditions: showWhen('rr_applies', 'Yes') },

  { fieldKey: 'rr_wishes_heading', type: 'subheading',
    label: 'Please check off your wishes below',
    helpText: 'Please select 1 (one) of the below options',
    conditions: showWhen('rr_applies', 'Yes') },

  { fieldKey: 'rr_wishes', type: 'radio',
    label: 'My wish',
    isRequired: false,
    options: [
      'I want my emergency contact to be called and to pick up my pet if they pass away – (However, if my emergency contact is unreachable, I understand that Pawsome 4 Pets (PTY) LTD will transport my pet to my Veterinary Clinic (if within 10km from P4P) or to nearest available Veterinary Clinic. I understand that it will be added to my bill.',
      'I authorize Pawsome 4 Pets (PTY) LTD to transport my pet to my Veterinary Clinic (if within 10km from P4P) or to the nearest available Veterinary Clinic for cremation and wish TO HAVE my pet’s ashes returned. I understand that it will be added to my bill.',
      'I authorize Pawsome 4 Pets (PTY) LTD to transport my pet to my Veterinary Clinic (if within 10km from P4P) or to the nearest available Veterinary Clinic for cremation and DO NOT wish to have my pet’s ashes returned. I understand that it will be added to my bill.',
    ],
    conditions: requireWhen('rr_applies', 'Yes') },

  { fieldKey: 'rr_notify_timing', type: 'radio',
    label: 'Do you wish for us to inform you immediately after your dog’s passing OR closer to your return date (the day before check out)',
    isRequired: false,
    options: ['Immediately', 'Closer to Check Out date'],
    conditions: requireWhen('rr_applies', 'Yes') },

  { fieldKey: 'rr_agree', type: 'checkbox',
    label: 'I have read, understood and accept the above-mentioned Rainbow Request Instructions as outlined by Pawsome 4 Pets (PTY) LTD. I Agree.',
    isRequired: false,
    conditions: requireWhen('rr_applies', 'Yes') },

  { fieldKey: 'rr_signature', type: 'text',
    label: 'Signature',
    isRequired: false,
    helpText: 'Type your full name as a signature.',
    conditions: requireWhen('rr_applies', 'Yes') },

  // ════════════════════════════════════════════════════════════════════════════
  // URGENT VETERINARY AUTHORISATION
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_vet_auth', type: 'section', label: 'Urgent Veterinary Authorisation',
    helpText: 'The details on the below form is that of the person responsible for the Veterinary bill should also be signed by said owner. No person below the age of 18.\n\nFailure to provide the correct information will result in your dog not being able to receive emergency medical treatment.\n\nThis form will be retained on file and will be used to authorize urgent veterinary treatment by any emergency veterinary clinic in the event that your dog(s) require such treatment while in the care of Pawsome 4 Pets (PTY) LTD during your absence.' },

  { fieldKey: 'vet_owner_first', type: 'text',  label: 'First', isRequired: true },
  { fieldKey: 'vet_owner_last',  type: 'text',  label: 'Last',  isRequired: true,
    helpText: 'The person that will be responsible for the medical bill' },
  { fieldKey: 'vet_owner_id',    type: 'text',  label: 'Identity Number', isRequired: true,
    helpText: 'Please note: Not providing an Identity Number will prevent Pawsome 4 Pets (PTY) LTD from seeking Urgent Veterinary care and do you agree that you or your emergency contact will be responsible to seek urgent veterinary care. Pawsome 4 Pets (PTY) LTD CANNOT BE HELD LIABLE FOR ANY LOSS OF OR DEATH DUE TO CLIENT NON COMPLIANCE.' },
  { fieldKey: 'vet_owner_phone1', type: 'tel',   label: 'Owner’s Contact Number', isRequired: true,  placeholder: 'Phone (International)' },
  { fieldKey: 'vet_owner_phone2', type: 'tel',   label: 'Owner’s Contact Number', isRequired: false, placeholder: 'Phone (International)' },
  { fieldKey: 'vet_owner_email',  type: 'email', label: 'Email', isRequired: true },
  { fieldKey: 'vet_addr1',    type: 'text', label: 'Address Line 1',            isRequired: true },
  { fieldKey: 'vet_addr2',    type: 'text', label: 'Address Line 2',            isRequired: false },
  { fieldKey: 'vet_city',     type: 'text', label: 'City',                      isRequired: true },
  { fieldKey: 'vet_province', type: 'text', label: 'State / Province / Region', isRequired: true },
  { fieldKey: 'vet_postal',   type: 'text', label: 'Postal / Zip Code',         isRequired: true },
  { fieldKey: 'vet_dogs_names',            type: 'text', label: 'Dog(s) Name',                           isRequired: true },
  { fieldKey: 'vet_regular_clinic',        type: 'text', label: 'Regular Veterinary Clinic',             isRequired: true },
  { fieldKey: 'vet_regular_clinic_phone',  type: 'tel',  label: 'Contact Number of Regular Veterinary Clinic', isRequired: true, placeholder: 'Phone (International)' },

  { fieldKey: 'vet_indemnity', type: 'paragraph',
    helpText: 'I, have contracted services of Pawsome 4 Pets (PTY) LTD for the duration of my absence and I authorize Pawsome 4 Pets (PTY) LTD to act on my behalf and request veterinary treatment and services when they deem necessary.\n\nI accept full responsibility for charges incurred in the treatment of my dog(s). I, therefore agree to indemnify and hold harmless Pawsome 4 Pets (PTY) LTD from any liability relating to transportation, treatment and expenses. Pawsome 4 Pets (PTY) LTD are authorized to approve medical and/or emergency treatment (excluding euthanasia) as recommended by a Veterinarian.' },

  { fieldKey: 'vet_max_cost', type: 'text', label: 'Veterinary costs may not exceed', isRequired: true,
    placeholder: 'R500 000,00' },
  { fieldKey: 'vet_agree', type: 'checkbox',
    label: 'I have read, understood and accept the above-mentioned Urgent Veterinary Authorisation as outlined by Pawsome 4 Pets (PTY) LTD. I Agree.',
    isRequired: true },
  { fieldKey: 'vet_signature', type: 'text', label: 'Signature', isRequired: true,
    helpText: 'Type your full name as a signature.' },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARDING TERMS, CONDITIONS AND INDEMNITIES — full 11 clauses
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_boarding_tc', type: 'section', label: 'Boarding Terms, Conditions and Indemnities',
    helpText: 'We want your pet’s experience at Pawsome 4 Pets (PTY) LTD to be as pleasant and stress free as possible. It is important to understand that some pet(s) respond to new environments differently, even with the best efforts. We will make every effort to make it a positive experience.' },

  { fieldKey: 'bt_h1', type: 'subheading', label: '1. Information',
    helpText: 'At Pawsome 4 Pets (PTY) LTD we strive in creating a home environment and a quality stay for each dog. We cannot achieve these results if information provided by the client to us is incorrect.' },
  { fieldKey: 'bt_1_1', type: 'paragraph', helpText: '1.1. I, the client understand that my dog(s) wellbeing will be in jeopardy if I give incorrect or limited information to Pawsome 4 Pets (PTY) LTD.' },

  { fieldKey: 'bt_h2', type: 'subheading', label: '2. Vaccinations/Deworming/Tick & Flea' },
  { fieldKey: 'bt_2_1',   type: 'paragraph', helpText: '2.1. All adult dog(s) must have had vaccinations (5 in 1, Rabies and Kennel Cough) within the last 12 months prior to service being rendered.' },
  { fieldKey: 'bt_2_1_1', type: 'paragraph', helpText: '2.1.1. Puppies must be up to date with vaccines as per Veterinarian’s prescription. Puppies must at least have had 2 vaccines prior to service being rendered.' },
  { fieldKey: 'bt_2_1_2', type: 'paragraph', helpText: '2.1.2. A Veterinary Card / Inoculation Certificate / Veterinary Records must be provided with your booking. If failing to do so Pawsome 4 Pets (PTY) LTD may terminate the booking with full/partial/no refund. This will be handled with discretion by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_2_2',   type: 'paragraph', helpText: '2.2. All dog(s) must be dewormed and have had treatment against ticks & fleas prior to services being rendered. Domestic dogs should be dewormed every 3 months. Tick and flea treatment should be up to date based on the product used.' },
  { fieldKey: 'bt_2_2_1', type: 'paragraph', helpText: '2.2.1. Dog(s) will be screened for parasites upon arrival. If any parasites are visible, Pawsome 4 Pets (PTY) LTD may terminate the booking with full/partial/no refund. This will be handled with discretion by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_2_3',   type: 'paragraph', helpText: '2.3. The client understand that all dog(s) should be up to date with vaccinations and parasitic control as our minimum requirement. Client agrees to indemnify and hold harmless Pawsome 4 Pets (PTY) LTD for any liability in the event of client’s dog(s) contracting (including but not limited to) diseases and or parasites.' },
  { fieldKey: 'bt_2_4',   type: 'paragraph', helpText: '2.4. Client agrees to reimburse Pawsome 4 Pets (PTY) LTD for any costs incurred, including but not limited to, contracting out pest control for clearing of infestations, Medical- and veterinary care while our staff, resident dogs as well as boarding dogs were exposed to client’s dog(s). Client understands that a service agreement may be terminated with immediate effect by Pawsome 4 Pets (PTY) LTD in the event of observing any contagious disease / parasites upon arrival without a refund for the remaining days.' },

  { fieldKey: 'bt_h3', type: 'subheading', label: '3. Intact Male / Female dogs' },
  { fieldKey: 'bt_3_1', type: 'paragraph', helpText: '3.1. Any dog over the age of 6 months must be spayed / neutered.' },
  { fieldKey: 'bt_3_2', type: 'paragraph', helpText: '3.2. Female dogs that are in their heat cycle will not be admitted for services. Up to 21 days after the heat (bleeding) cycle stops, the fertility period start. Pawsome 4 Pets (PTY) LTD reserve the right of admission and may terminate the booking with full/partial/no refund.' },
  { fieldKey: 'bt_3_3', type: 'paragraph', helpText: '3.3. Male dogs that are intact will mount other dogs which causes distress amongst neutered males. Intact male dogs will not be admitted for services. Pawsome 4 Pets (PTY) LTD reserve the right of admission and may terminate the booking with full/partial/no refund.' },

  { fieldKey: 'bt_h4', type: 'subheading', label: '4. Aggression / Bad Behaviour' },
  { fieldKey: 'bt_4_1', type: 'paragraph', helpText: '4.1. Client will describe all incidents of aggression or any other behavioural issues to Pawsome 4 Pets (PTY) LTD. Pawsome 4 Pets (PTY) LTD reserve the right of admission related to aggressive dog(s) or dog(s) with behavioural issues.' },
  { fieldKey: 'bt_4_2', type: 'paragraph', helpText: '4.2. Client understands that a service agreement may be terminated with immediate effect by Pawsome 4 Pets (PTY) LTD in the event of an aggressive episode without a refund for the remaining days.' },
  { fieldKey: 'bt_4_3', type: 'paragraph', helpText: '4.3. Pawsome 4 Pets (PTY) LTD does not accept any aggressive dog(s). Client agrees to be responsible for all costs (including but not limited to) medical- and veterinary care, if a client’s dog(s) should bite and or injure our staff, personal dogs and dogs boarding at Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_4_4', type: 'paragraph', helpText: '4.4. The client agrees to indemnify and hold harmless Pawsome 4 Pets (PTY) LTD from any liability resulting from injuries / damage / ailments inflicted / caused by their dog(s) on third parties and any injury suffered by their dog(s).' },

  { fieldKey: 'bt_h5', type: 'subheading', label: '5. Ailments and Injuries',
    helpText: 'Pawsome 4 Pets PTY LTD is a kennel-free environment. Our dog guests are thus not kept in kennels and are free to play, explore and be happy dogs in a natural environment. Dogs are in contact with humans and other dogs in a social setting. It is therefore important to realise that dogs may get (including but not limited to) small scrapes / insect bites / eye irritations from dust / chipped toenails / etc. We keep a strict hygiene policy with regards to sanitation as well as a safe and secure area. We boast with a disease free record for the last 10+ years.' },
  { fieldKey: 'bt_5_1', type: 'paragraph', helpText: '5.1. I, the client understand that I cannot send a dog with contagious disease into a social setting. If any diseases are visible, Pawsome 4 Pets (PTY) LTD may terminate the booking with full/partial/no refund. This will be handled with discretion by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_5_2', type: 'paragraph', helpText: '5.2. Pawsome 4 Pets (PTY) LTD is released from all liability for loss of / or damage (including but not limited to) any veterinary expenses incurred in respect of the dog(s), sickness, injury or escape, and loss / death at Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'bt_5_3', type: 'paragraph', helpText: '5.3. Pawsome 4 Pets (PTY) LTD is released from all liability related to the transportation of dog(s) to and from any Veterinary Clinic, Emergency Veterinary Clinic, the medical treatment of the dog(s) and the expenses thereof.' },

  { fieldKey: 'bt_h6', type: 'subheading', label: '6. Medication' },
  { fieldKey: 'bt_6_1', type: 'paragraph', helpText: '6.1. Please provide Pawsome 4 Pets (PTY) LTD with the necessary medication and clear instructions on the administration of medications.' },
  { fieldKey: 'bt_6_2', type: 'paragraph', helpText: '6.2. While our staff is trained in administering medication Pawsome 4 Pets (PTY) LTD cannot be held liable for any complications while administering medications to the dog(s).' },

  { fieldKey: 'bt_h7', type: 'subheading', label: '7. Belongings' },
  { fieldKey: 'bt_7_1', type: 'paragraph', helpText: '7.1. All dogs must come with a properly fitted harness or travel crate. Step in and Rogz H harnesses are the most secure. Please make sure that your dog cannot slip out of their harness. Pawsome 4 Pets (PTY) LTD does not take any responsibility for dogs that slip out of their harness and run away / get injured by passing cars.' },
  { fieldKey: 'bt_7_2', type: 'paragraph', helpText: '7.2. The client is responsible to provide Pawsome 4 Pets (PTY) LTD with the necessary supplies needed for the care of their dog(s).\n\n  • Food\n  • Medication / Supplements (Please don’t bring probiotics, it is standard in all our water bowls at Pawsome 4 Pets (PTY) LTD.\n  • During festive season (November till January) we ask that Prescribed Anxiety Medication to be sent along. Herbal medications are not effective for a one day use and should be started at least a month in advance.\n  • Properly fitted harness and lead / Traveling Crate.\n  • 1x Small fleece blanket (please don’t bring a bed we provide beds).\n  • You are welcome to send a jersey in winter (please don’t bring clothes as it will get damaged).\n  • At Pawsome 4 Pets we crates filled with toys. Please don’t bring toys as it will get damaged. We also provide treats therefore treats are not needed.' },
  { fieldKey: 'bt_7_3', type: 'paragraph', helpText: '7.3. All belongings / supplies should be marked / labelled clearly.' },
  { fieldKey: 'bt_7_4', type: 'paragraph', helpText: '7.4. Pawsome 4 Pets (PTY) LTD is released from all liability for loss of / or damage (including but not limited to) to goods brought to / left at Pawsome 4 Pets (PTY) LTD.' },

  { fieldKey: 'bt_h8', type: 'subheading', label: '8. Admission / Collection' },
  { fieldKey: 'bt_8_1', type: 'paragraph', helpText: '8.1. Client understands that Pawsome 4 Pets (PTY) LTD is a home boarding facility and adhere to our trading hours in respect of our household and other boarding dogs.\n\n  8.1.1. Pawsome 4 Pets (PTY) LTD trading hours are:\n    • Monday Wednesday & Friday: 09:30 – 11:00 & 15:30 – 17:00\n    • Tuesday, Thursday & Saturday: 10:00 – 11:00\n    • Sunday: 11:00 to 13:00\n    • Public Holidays (Excluding December 25th, December 26th, January 1st) – times are available upon request and on booking confirmation emails.\n\n  8.1.2. Pawsome 4 Pets (PTY) LTD hours for the festive season:\n    • December 24th – 10:00 – 11:00\n    • December 25th – CLOSED\n    • December 26th – 10:00 to 14:00\n    • January 1st – CLOSED' },
  { fieldKey: 'bt_8_2', type: 'paragraph', helpText: '8.2. Client agrees that dog(s) that are not collected before closing time on the day of departure without sufficient communication at least one (1) hour prior to closing time, will be kept and a penalty fee is payable upon collection. R200 per dog up until an hour after closing time and thereafter no dog shall leave until trading start on the following day with a full day and penalty fee per dog payable in cash upon collection of dogs.' },
  { fieldKey: 'bt_8_3', type: 'paragraph', helpText: '8.3. Client agrees that any dog(s) that are not collected within seven (7) days after intended departure date may at the discretion of Pawsome 4 Pets (PTY) LTD be surrendered to any animal welfare society, in the event of no sufficient communication from the client.' },
  { fieldKey: 'bt_8_4', type: 'paragraph', helpText: '8.4. Pawsome 4 Pets (PTY) LTD is released from all liability related to injuries by client(s) and / or dog(s) that may occur at Pawsome 4 Pets (PTY) LTD and the expenses thereof.' },

  { fieldKey: 'bt_h9', type: 'subheading', label: '9. Payment and Cancellation' },
  { fieldKey: 'bt_9_1',   type: 'paragraph', helpText: '9.1. Payments:' },
  { fieldKey: 'bt_9_1_1', type: 'paragraph', helpText: '9.1.1. A deposit of 50% of the original amount is payable within seven (7) days after receipt of quotation to secure service booking; failing to do so will result in your dog not having a booking.' },
  { fieldKey: 'bt_9_1_2', type: 'paragraph', helpText: '9.1.2. The remaining 50% is payable on the day of admission. Payment can be made through EFT / Cash.' },
  { fieldKey: 'bt_9_1_3', type: 'paragraph', helpText: '9.1.3. Please use the reference number as indicated on your invoice / booking confirmation. Failing to use a reference number will result in unallocated payments.' },
  { fieldKey: 'bt_9_1_4', type: 'paragraph', helpText: '9.1.4. Proof of payments can be sent to info@pawsome4pets.co.za / bookings@pawsome4pets.co.za' },
  { fieldKey: 'bt_9_2',   type: 'paragraph', helpText: '9.2. Cancelations of booked services at Pawsome 4 Pets (PTY) LTD will result in a payable cancelation fee:' },
  { fieldKey: 'bt_9_2_1', type: 'paragraph', helpText: '9.2.1. If a booking is cancelled more than 7days prior to arrival, 75% of the deposit amount is refundable. The full amount can be kept as credit if the client wishes not to have a refund paid out.' },
  { fieldKey: 'bt_9_2_2', type: 'paragraph', helpText: '9.2.2. If a booking is cancelled less than 7days prior to arrival, 50% of the deposit amount is refundable. 75% of the deposit amount can be kept as credit if the client wishes not to have a refund paid out.' },

  { fieldKey: 'bt_h10', type: 'subheading', label: '10. Updates' },
  { fieldKey: 'bt_10_1', type: 'paragraph', helpText: '10.1. Pawsome 4 Pets (PTY) LTD will give 1 update per day as and when time permits. During festive periods we might not be able to give one daily but will try our best to get to everyone.' },
  { fieldKey: 'bt_10_2', type: 'paragraph', helpText: '10.2. Video calls will unfortunately not be accepted.' },
  { fieldKey: 'bt_10_3', type: 'paragraph', helpText: '10.3. Please also look at our social media pages (Facebook / Instagram / Tiktok) for pictures and videos. @pawsome4pets' },

  { fieldKey: 'bt_h11', type: 'subheading', label: '11. Pictures / Videos' },
  { fieldKey: 'bt_11_1', type: 'paragraph', helpText: '11.1. Photos taken of dogs at the Pawsome 4 Pets (PTY) LTD facilities are the property of Pawsome 4 Pets (PTY) LTD and may be used for marketing and social media activities.' },
  { fieldKey: 'bt_11_2', type: 'paragraph', helpText: '11.2. I give permission for my dog to be photographed/videotaped, and/or used in any advertising or for media purposes without prior approval by me. All such materials are the property of Pawsome 4 Pets (PTY) LTD.' },

  { fieldKey: 'bt_name_first', type: 'text',     label: 'First',     isRequired: true },
  { fieldKey: 'bt_name_last',  type: 'text',     label: 'Last',      isRequired: true },
  { fieldKey: 'bt_agree',      type: 'checkbox', label: 'I have read, understood and accept the above-mentioned Terms, Conditions & Indemnities as outlined by Pawsome 4 Pets (PTY) LTD. I Agree.', isRequired: true },
  { fieldKey: 'bt_signature',  type: 'text',     label: 'Signature', isRequired: true,
    helpText: 'Type your full name as a signature.' },

  // ════════════════════════════════════════════════════════════════════════════
  // GROOMING TERMS CONDITIONS AND INDEMNITIES — full 13 clauses
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_grooming_tc', type: 'section', label: 'Grooming Terms Conditions and Indemnities',
    helpText: 'We want your pet’s experience at Pawsome 4 Pets (PTY) LTD to be as pleasant and stress free as possible. It is important to understand that some pet(s) respond to grooming differently, even with the best efforts. We will make every effort to make it a positive experience.' },

  { fieldKey: 'gt_h1', type: 'subheading', label: '1. Aggressive / Difficult Pets' },
  { fieldKey: 'gt_1_1', type: 'paragraph', helpText: '1.1. Pawsome 4 Pets (PTY) LTD, employees have had experience and success in the grooming of difficult or aggressive pets. However, we reserve the right to halt the grooming process should a pet become too difficult to groom or aggressive to the detriment or potential injury of themselves, or the Pawsome 4 Pets (PTY) LTD employees. Full- or Partial grooming charges may apply at the discretion of Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'gt_1_2', type: 'paragraph', helpText: '1.2. Please provide Pawsome 4 Pets (PTY) LTD with any behavioural history or your pet.' },
  { fieldKey: 'gt_1_3', type: 'paragraph', helpText: '1.3. Muzzles may be used if necessary. Muzzling will not harm your pet and will protect both the pet and the groomer.' },

  { fieldKey: 'gt_h2', type: 'subheading', label: '2. Accidents' },
  { fieldKey: 'gt_2_1', type: 'paragraph', helpText: '2.1. While Pawsome 4 Pets (PTY) LTD take extreme caution in the grooming of pet(s), the possibility of accidents may occur.' },
  { fieldKey: 'gt_2_2', type: 'paragraph', helpText: '2.2. There are many contributing factors that can lead to accidents, including but not limited, grooming equipment that is sharp, the condition of the coat and animals’ unpredictability.' },
  { fieldKey: 'gt_2_3', type: 'paragraph', helpText: '2.3. Pawsome 4 Pets (PTY) LTD, its owner and employees will not be held liable for any accidents that may occur.' },

  { fieldKey: 'gt_h3', type: 'subheading', label: '3. Health and Senior Pets' },
  { fieldKey: 'gt_3_1', type: 'paragraph', helpText: '3.1. Client must inform Pawsome 4 Pets (PTY) LTD about any and all medical conditions. Pawsome 4 Pets (PTY) LTD reserve the right to refuse grooming any pet that have any of the following:\n\n  3.1.1. Stitches from surgery\n  3.1.2. Any open or weeping wounds\n  3.1.3. Any form of ill health\n  3.1.4. Vomiting and / or Diarrhoea\n  3.1.5. Breathing difficulties\n  3.1.6. Unusual lethargy\n  3.1.7. Heart Conditions\n  3.1.8. Any other signs of injury or illness not yet seen to by a vet.' },
  { fieldKey: 'gt_3_2', type: 'paragraph', helpText: '3.2. Pawsome 4 Pets (PTY) LTD, its owner and employees will not be held liable for any incidents that may occur due to ill health. It is advisable that your dog gets a yearly check-up done with its annual vaccinations to diagnose any chronic conditions.' },

  { fieldKey: 'gt_h4', type: 'subheading', label: '4. Vaccinations and Parasite Treatment' },
  { fieldKey: 'gt_4_1', type: 'paragraph', helpText: '4.1. Pawsome 4 Pets (PTY) LTD is a kennel-free facility.' },
  { fieldKey: 'gt_4_2', type: 'paragraph', helpText: '4.2. Pet(s) below the age of 8 years is required to be vaccinated.' },
  { fieldKey: 'gt_4_3', type: 'paragraph', helpText: '4.3. Deworming should be done every 3 months.' },
  { fieldKey: 'gt_4_4', type: 'paragraph', helpText: '4.4. Pet(s) with signs of ringworms will not be groomed as well as pets from the same household. Pet Owner will be held liable for full grooming charges.' },
  { fieldKey: 'gt_4_5', type: 'paragraph', helpText: '4.5. Pets with ticks and / or flea infestations will be treated at an additional cost.' },

  { fieldKey: 'gt_h5', type: 'subheading', label: '5. Kennelling of pets' },
  { fieldKey: 'gt_5_1', type: 'paragraph', helpText: '5.1. Small breed dogs will not be kennelled. All dogs above knee hight will be kennelled as well as cats.' },
  { fieldKey: 'gt_5_2', type: 'paragraph', helpText: '5.2. Small breed dogs may be kennelled if they carry ticks and / or fleas.' },
  { fieldKey: 'gt_5_3', type: 'paragraph', helpText: '5.3. Small breed dogs that are showing signs of aggression towards other Boarding and / or Spa guests will be kennelled.' },

  { fieldKey: 'gt_h6', type: 'subheading', label: '6. De-matting' },
  { fieldKey: 'gt_6_1', type: 'paragraph', helpText: '6.1. Matts / Tangles / Knots in the coat is easily preventable by the pet owner. Lack of prevention is by the negligence of the owner.' },
  { fieldKey: 'gt_6_2', type: 'paragraph', helpText: '6.2. Pawsome 4 Pets (PTY) LTD carry a Humanity over Vanity Policy which is - If the matting is compromising the wellbeing of the dog, we will shave it off (full or partial shaving depending on the condition of the coat). We will inform you prior to shaving. Even with instructions that we should brush it out (instead of shaving), we will not proceed with the groom and full grooming charges will apply.' },
  { fieldKey: 'gt_6_3', type: 'paragraph', helpText: '6.3. Mats left in a pet’s coat only grow tighter and can strangle the pet’s skin, or eventually tear it open. Mats can be very difficult to remove and may require the pet to be shaved. When necessary, removing a heavily matted coat includes risks of nicks, cuts or abrasions due to warts, moles or skin folds trapped in the mats. Heavy matting can also trap moisture and urine near the pet’s skin allowing mould, fungus or bacteria to grow, causing skin irritations that existed prior to the grooming process. Torn skin from mats can also harbour maggots. After-effects of mat removal procedures can include itchiness, skin redness, self-inflicted irritations or abrasions and failure of the hair to re-grow.' },
  { fieldKey: 'gt_6_4', type: 'paragraph', helpText: '6.4. Pawsome 4 Pets (PTY) LTD does not wish to cause serious or undue stress to your pet and will not continually de-mat your pet for you. Prevention is the best defence against matting by scheduling regular grooming appointments (4 - 6 weeks).' },
  { fieldKey: 'gt_6_5', type: 'paragraph', helpText: '6.5. Pawsome 4 Pets (PTY) LTD, its owner and employees will not be held liable for any injury that may occur due to de-matting, shaving of a matted coat or the aftereffects of the forementioned.' },

  { fieldKey: 'gt_h7', type: 'subheading', label: '7. Shaving' },
  { fieldKey: 'gt_7_1', type: 'paragraph', helpText: '7.1. Pawsome 4 Pets (PTY) LTD use professional pet grooming equipment. Our blades are made from metal and are sharpened and serviced regularly.' },
  { fieldKey: 'gt_7_2', type: 'paragraph', helpText: '7.2. Shaving pets may cause sudden and brief behavioral changes.' },
  { fieldKey: 'gt_7_3', type: 'paragraph', helpText: '7.3. Shaving pets may cause skin irritation, redness, sensitivity.' },
  { fieldKey: 'gt_7_4', type: 'paragraph', helpText: '7.4. Shaving pets may cause sunburn due to the shortened coat. Petscreen (Pet Sunscreen) is available to purchase. Alternatively, they should be kept out of prolonged sun exposure.' },
  { fieldKey: 'gt_7_5', type: 'paragraph', helpText: '7.5. With the shaving of pets, accidents may occur. Pawsome 4 Pets (PTY) LTD, its owner and employees cannot be held liable for any injuries.' },

  { fieldKey: 'gt_h8', type: 'subheading', label: '8. Shaving of Double Coated Dogs' },
  { fieldKey: 'gt_8_1', type: 'paragraph', helpText: '8.1. Shaving of double coated dogs are not advised/supported by Pawsome 4 Pets (PTY) LTD.' },
  { fieldKey: 'gt_8_2', type: 'paragraph', helpText: '8.2. The shaving of a double coated dog may result in the permanent damage of the coat as well as permanent hair loss.' },
  { fieldKey: 'gt_8_3', type: 'paragraph', helpText: '8.3. Post Clipping Alopecia is not treatable.' },
  { fieldKey: 'gt_8_4', type: 'paragraph', helpText: '8.4. Pawsome 4 Pets (PTY) LTD will not shave a double coated dog shorter than a #4 blade.' },
  { fieldKey: 'gt_8_5', type: 'paragraph', helpText: '8.5. Double coated dogs include but not limited to Pomeranian, Pekingese, Husky, Chow Chow, Shephards, Retrievers, Collies, Corgi, etc.' },
  { fieldKey: 'gt_8_6', type: 'paragraph', helpText: '8.6. Shaving such breeds does not keep them cooler.' },
  { fieldKey: 'gt_8_7', type: 'paragraph', helpText: '8.7. I understand the dangers of shaving a double coated dog. Pawsome 4 Pets (PTY) LTD, its owner and employees cannot be held liable for anything that may go wrong pre- and post-shaving of a double coated dog.' },

  { fieldKey: 'gt_h9', type: 'subheading', label: '9. Shaving of puppies' },
  { fieldKey: 'gt_9_1', type: 'paragraph', helpText: '9.1. Pawsome 4 Pets (PTY) LTD use professional pet grooming equipment. Our blades are made from metal and are sharpened and serviced regularly.' },
  { fieldKey: 'gt_9_2', type: 'paragraph', helpText: '9.2. Shaving puppies may cause sudden and brief behavioral changes.' },
  { fieldKey: 'gt_9_3', type: 'paragraph', helpText: '9.3. Shaving puppies for the first time may cause Itchiness, skin irritation, redness, self-inflicted skin irritations and sensitivity.' },
  { fieldKey: 'gt_9_4', type: 'paragraph', helpText: '9.4. Shaving pets may cause sunburn due to the shortened coat. Petscreen (Pet Sunscreen) is available to purchase. Alternatively, they should be kept out of prolonged sun exposure.' },
  { fieldKey: 'gt_9_5', type: 'paragraph', helpText: '9.5. With the shaving of puppies, accidents may occur. Pawsome 4 Pets (PTY) LTD, its owner and employees cannot be held liable for any injuries.' },

  { fieldKey: 'gt_h10', type: 'subheading', label: '10. Payment and Cancelations' },
  { fieldKey: 'gt_10_1', type: 'paragraph', helpText: '10.1. Payment can be done by Cash, Card or Geo Payment (for FNB clients).' },
  { fieldKey: 'gt_10_2', type: 'paragraph', helpText: '10.2. Cancelations done within 24hours of booked appointment or continual rescheduling of appointments will subject to a 100% cancelation fee.' },
  { fieldKey: 'gt_10_3', type: 'paragraph', helpText: '10.3. Clients that do not show up for their appointment will be charged 50% of the scheduled grooming service.' },

  { fieldKey: 'gt_h11', type: 'subheading', label: '11. Packages' },
  { fieldKey: 'gt_11_1', type: 'paragraph', helpText: '11.1. Pawsome 4 Pets (PTY) LTD has grooming packages available upon request.' },
  { fieldKey: 'gt_11_2', type: 'paragraph', helpText: '11.2. Grooming packages are payable in full on the first groom of the month.' },
  { fieldKey: 'gt_11_3', type: 'paragraph', helpText: '11.3. No grooming appointment will be carried over to the next month.' },

  { fieldKey: 'gt_h12', type: 'subheading', label: '12. Photographs' },
  { fieldKey: 'gt_12_1', type: 'paragraph', helpText: '12.1. I understand that my dog might be photographed and used for advertising purposes.' },

  { fieldKey: 'gt_h13', type: 'subheading', label: '13. Hold Harmless Agreement' },
  { fieldKey: 'gt_13_1', type: 'paragraph', helpText: '13.1. By signing this contract, you agree to hold Pawsome 4 Pets (PTY) LTD, its owners and employees harmless from any damage, injury, loss, or claim arising from any condition of the undersigned pet, either known or unknown by yourself and / or Pawsome 4 Pets (PTY) LTD.' },

  { fieldKey: 'gt_name_first', type: 'text',     label: 'First',     isRequired: true },
  { fieldKey: 'gt_name_last',  type: 'text',     label: 'Last',      isRequired: true },
  { fieldKey: 'gt_agree',      type: 'checkbox', label: 'I have read, understood and accept the above-mentioned Terms, Conditions & Indemnities as outlined by Pawsome 4 Pets (PTY) LTD. I Agree.', isRequired: true },
  { fieldKey: 'gt_signature',  type: 'text',     label: 'Signature', isRequired: true,
    helpText: 'Type your full name as a signature.' },

  // ════════════════════════════════════════════════════════════════════════════
  // BOOKING REQUIREMENTS
  // ════════════════════════════════════════════════════════════════════════════
  { fieldKey: 'sec_booking', type: 'section', label: 'Booking Requirements' },

  { fieldKey: 'sec_services', type: 'subheading', label: 'Services Required' },
  { fieldKey: 'svc_boarding', type: 'radio', label: 'Boarding (Sleep Over)',               isRequired: true, options: ['No', 'Yes'] },
  { fieldKey: 'svc_grooming', type: 'radio', label: 'Grooming (Wash / Shave / Style etc)', isRequired: true, options: ['No', 'Yes'] },
  { fieldKey: 'svc_daycare',  type: 'radio', label: 'Daycare (Day Stay - No Sleep Over)',  isRequired: true, options: ['No', 'Yes'] },

  { fieldKey: 'arrival_date',   type: 'date', label: 'Date of Arrival (Check In)',                            isRequired: true },
  { fieldKey: 'arrival_time',   type: 'text', label: 'Estimate Time of Arrival (Please see Trading Hours)',   isRequired: true, placeholder: 'e.g. 10:30' },
  { fieldKey: 'departure_date', type: 'date', label: 'Date of Departure (Check Out)',                         isRequired: true },
  { fieldKey: 'departure_time', type: 'text', label: 'Estimate Time of Departure (Please see Trading Hours)', isRequired: true, placeholder: 'e.g. 16:00' },

  { fieldKey: 'note_trading_hours', type: 'paragraph', label: 'Our Trading Hours are as follow:',
    helpText: 'Monday, Wednesday, Friday: 09:30 - 11:00 and 15:30 - 17:00\n\nTuesday, Thursday, Saturday: 10:00 - 11:00\n\nSunday: 11:00 - 13:00\n\nPublic Holiday trading hours are available on our website.' },

  { fieldKey: 'note_thanks', type: 'paragraph',
    helpText: 'Thank you for trusting us with your additional furry family member! At Pawsome 4 Pets our guests become family and we honour the privilege of taking care of your little one in your absence.' },
];

fields.forEach((f) => {
  if (!f.label && f.type === 'paragraph' && typeof f.helpText === 'string') {
    const m = f.helpText.match(/^(\d+(?:\.\d+)*\.?)/);
    if (m) f.label = `Clause ${m[1]}`;
  }
});

async function main() {
  console.log(`Logging in as ${EMAIL}…`);
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
  const token = loginJson.token;

  const list = await (await fetch(`${API}/api/admin/forms`, { headers: { Authorization: `Bearer ${token}` } })).json();
  let form = list.forms.find((f) => f.slug === SLUG);
  if (!form) {
    const created = await (await fetch(`${API}/api/admin/forms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Pawsome 4 Pets Dog Hotel & Spa - Additional Dog Application Form',
        slug: SLUG,
      }),
    })).json();
    form = created.form;
    console.log(`Created form id: ${form.id}`);
  } else {
    console.log(`Found existing form id: ${form.id}`);
  }

  console.log(`${fields.length} fields incoming…`);
  const saved = await (await fetch(`${API}/api/admin/forms/${form.id}/fields`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })).json();
  if (saved.error) throw new Error(`Field save failed: ${JSON.stringify(saved)}`);
  console.log(`Saved ${saved.form.fields.length} fields`);

  await (await fetch(`${API}/api/admin/forms/${form.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Pawsome 4 Pets Dog Hotel & Spa - Additional Dog Application Form',
      isPublished: true,
      createsAccount: true,
      successMessage: 'Thank you! We’ve received your additional dog application and will follow up shortly.',
    }),
  })).json();

  console.log('\nView:  ' + API.replace('4000', '5173') + '/forms/' + form.slug);
  console.log('Edit:  ' + API.replace('4000', '5173') + '/admin/forms/' + form.id);
}

main().catch((err) => { console.error(err); process.exit(1); });
