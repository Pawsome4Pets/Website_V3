// ===========================================================================
// CONTENT — single source of truth for the whole site.
// Edit copy here once and it updates everywhere.
// ===========================================================================

// --- Business --------------------------------------------------------------
export const business = {
  name: 'Pawsome 4 Pets',
  legal: 'Pawsome 4 Pets — Dog Hotel & Spa (PTY) LTD',
  tagline:
    'A kennel-free luxury home away from home for small and toy-breed dogs.',
  phone: '076 928 6797',
  phoneIntl: '+27 76 928 6797',
  whatsapp: '27769286797', // international format, no +
  email: 'info@pawsome4pets.co.za',
  website: 'https://www.pawsome4pets.co.za',
  address: '342 Bart Joubert St, Erasmia, Centurion, 0183',
  region: 'Centurion, Gauteng, South Africa',
  "hours": "Mon, Wed, Fri · 09:30–11:00 / 15:30–17:00 | Tue, Thu, Sat · 10:00–11:00 | Sun · 11:00–13:00 | Public Holidays · Times to be announced",
  mapEmbed:
    'https://www.google.com/maps?q=342+Bart+Joubert+St,+Erasmia,+Centurion,+0183&output=embed',
  social: {
    instagram: 'https://www.instagram.com/pawsome4pets',
    facebook:  'https://www.facebook.com/pawsome4pets',
  },
};

// --- External booking link -------------------------------------------------
// The "New Client" CTA is now an internal form chosen in Admin → Settings;
// see SiteConfigContext for the resolved href.
export const externalLinks = {
  booking:
    'https://www.kennelbooker.com/clientlogin.aspx?id=567fff42-a04d-4d42-b24e-8b3799964f7c',
};

// --- Navigation ------------------------------------------------------------
export const navLinks = [
  { to: '/',         label: 'Home' },
  { to: '/about',    label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/info',     label: 'Boarding Info' },
  { to: '/team',     label: 'Team' },
  { to: '/contact',  label: 'Contact' },
];

// --- Services --------------------------------------------------------------
export const services = [
  {
    icon: 'home',
    title: 'Kennel-Free Boarding',
    text: 'Your dog lives inside our home — soft beds, sunlit lounges and a large secure garden. No cages, ever. Short- and long-term stays.',
    note: 'Complimentary wash & dry for stays over 10 days.',
  },
  {
    icon: 'spa',
    title: 'Dog Spa',
    text: 'Calming, unrushed spa days in our exclusive non-commercial parlour. Strictly by appointment to keep the atmosphere serene.',
  },
  {
    icon: 'scissors',
    title: 'Grooming',
    text: 'Breed-specific cuts, bath-and-blow-dry and full styling — daycare is included with every grooming package.',
  },
  {
    icon: 'paw',
    title: 'Puppy Care',
    text: 'Gentle, attentive care for puppies who have completed their vaccinations. Routines, socialisation and lots of cuddles.',
  },
  {
    icon: 'heart',
    title: 'Frail & Special-Needs Care',
    text: 'Patient, hands-on care for senior, frail and special-needs guests. Calm environment, careful supervision, tailored routines.',
  },
  {
    icon: 'shield',
    title: 'Surgery Recovery',
    text: 'A quiet, supervised space to heal. Medication administered on schedule, gentle handling and close monitoring during recovery.',
  },
];

// --- Team ------------------------------------------------------------------
export const team = [
  {
    name: 'Anzelle',
    image: '/assets/images/team-anzelle.jpg',
    bio: 'Anzelle traded chalk boards for dog fur and wagging tails. She always knew her passion lays with animals.In her early years she grew up with dogs, snakes, birds, hamsters and fish. In her most recent years she’s a proud dog mother of a few tiny Yorkshire Terriers, Dachshunds and a rescue Jack Russell. In her free time, she can be found somewhere in nature, admiring a sunset or expanding her knowledge in the field of animal health.',
  },
  {
    name: 'Adriaan',
    image: '/assets/images/team-anton.jpg',
    bio: 'Adriaan traded the tranquility of the Limpopo bushveld for life in the concrete jungle — but his roots in the outdoors still shape who he is today.His passion for animals and conservation knows no bounds, whether working with domestic pets, wildlife, or cattle. From the farm to the city, he carries a deep respect for nature, hard work, and hands-on problem solving. When he’s not immersed in the world of animals and agriculture, he channels his creativity into technology. In his free time, he enjoys developing servers, software, and websites, combining technical skill with innovation and attention to detail.',
  },
  {
    name: 'Anton',
    image: '/assets/images/team-adriaan.jpg',
    bio: 'Anton is a retired soldier at the South African Airforce that proudly served our country for 40 years.          As a youngster he was one of the founding members of a well-known Animal Park. That is where his love for animals started. He is also a retired snake handler that traded his safety goggles and hooks for a Yorkshire Terrier named Steffie. In his free time, he can be found building something in his workshop, enjoying the outdoors or reading.',
  },
];

// --- Testimonials ----------------------------------------------------------
export const testimonials = [
  {
    quote:
      'Pawsome4Pets fully deserves the 5 star rating I gave them. It was the first time we had left our Scottie, McDuff, with anyone else. McDuff immediately took to Anzelle, and this gave us such peace of mind. McDuff clearly enjoyed his stay with Anzelle from Pawsome4Pets as we collected a happy, healthy dog after our holiday.I must also mention how impressed I was with the area where the dogs get to play and run around in. It is a nice size and is so well maintained.I would most definitely recommend Pawsome4Pets , Erasmia for anyone looking for safe , clean and caring lodgings for their pets.',
    author: 'Brenda Bosman',
    pet: 'Terrier Family',
  },
  {
    quote:
      "The best place to leave your Yorkie while you're away. It’s clear that the owners truly love and care for every dog. The Yorkies stay inside the home, enjoy a large yard to run and play, and are treated like part of the family — even sleeping on the bed.",
    author: 'Stefan Reinecke',
    pet: 'Yorkie Family',
  },
  {
    quote:
      'Amazing place.When we drop our dogs off they run eagerly and excitedly to her place - which is a clear signthat they are treated very well.Anzelle is a great host and always keeps us informed as to how our kids are doing.On a recent trip 1 of our dogs went into early labour - and Anzelle tookcare of her, the delivery and aftercare until we got home.  All of this with a smile whilst sending us picturesand keeping us calm.All of this at a great price.I can recommend her with an open heart.',
    author: 'Johan Lourens',
    pet: 'Yorkie Owner',
  },
];

// --- Trust indicators ------------------------------------------------------
export const trust = [
  { value: '10yrs', label: 'Of Care Experience' },
  { value: '100%',  label: 'Kennel-Free' },
  { value: '24/7',  label: 'Human Companionship' },
  { value: 'Small', label: '& Toy-Breed Specialists' },
];

// --- Home slideshow (10 photos) -------------------------------------------
// REAL PHOTOS: drop files into /public/assets/images named slide-1.jpg .. slide-10.jpg
export const slides = Array.from({ length: 10 }, (_, i) => ({
  src: `/assets/images/slide-${i + 1}.jpg`,
  alt: [
    'Treat tower inspector on duty 🐾🧁',
    'Easter cutie spreading spring vibes 🐣🌸',
    'Fresh spa day, feeling fancy 🛁🐾', 
    'Tiny floof, big smile 😋',
    'Pretty in pink and full of fluff 🎀',
    'Zoomies activated across the lawn 🌿',
    'Serving looks and guarding snacks 🌭🐶',
    'Pool day for the little queen 💚',
    'Those puppy eyes get me every time 🥺',
    'Too cute to handle, too fast to catch 🐾💨'
  ][i],
}));

// --- About story sections --------------------------------------------------
export const story = [
  {
    heading: 'A Home, Not a Kennel',
    body:
      'Pawsome 4 Pets began with a simple, stubborn belief: dogs deserve to feel at home — even when their family is away. So we built a real one for them. Inside our house, dogs nap on soft beds, share sunny living rooms, and play in a large, secure garden. There are no cages, no concrete runs and no rows of identical pens. There is, simply, a family.',
  },
  {
    heading: 'Small & Toy-Breed Specialists',
    body:
      'We focus exclusively on small and toy-breed dogs because their care is its own art. The pack stays small and like-sized so every guest can relax, socialise and rest without the stress of being among much larger dogs. Anxious, senior and post-surgery guests receive especially patient, hands-on care.',
  },
  {
    heading: 'Care Without Compromise',
    body:
      'From individually-tailored feeding and medication to spa days and grooming, every detail is considered. We keep numbers intentionally small and admission requirements deliberately strict — because the calm, healthy environment our guests enjoy depends on it.',
  },
];

// --- What to Bring ---------------------------------------------------------
export const whatToBring = [
  { title: 'Your dog\'s food',             text: 'Enough of their usual food for the full stay — sudden diet changes upset tummies.' },
  { title: 'Medication & supplements',     text: 'Pre-portioned with clear written instructions for dose and timing.' },
  { title: 'A well-fitted harness & lead', text: 'For safe walks, transfers and any outings during the stay.' },
  { title: 'Favourite blanket or toy',     text: 'A familiar scent from home is the fastest way to settle in. Optional but lovely.' },
  { title: 'Updated vaccination card',     text: 'Proof of current vaccinations (see Vaccination Requirements). No card, no stay.' },
  { title: 'Emergency contact details',    text: 'A second contact who can make decisions on your behalf if you cannot be reached.' },
  { title: 'Feeding instructions',         text: 'Quantities, times and any treats or rituals that make mealtimes happy.' },
  { title: 'Anything else we should know', text: 'Allergies, fears, vet details and routines. The more we know, the better the stay.' },
];

// --- Vaccinations ----------------------------------------------------------
export const vaccinations = {
  required: [
    'Rabies — current and certified',
    '5-in-1 (DHPPi-L) — current',
    'Kennel cough / Bordetella — strongly recommended, often required',
    'Tick & flea treatment — applied before arrival',
    'Deworming — up to date',
  ],
  rules: [
    'Owners must bring a vaccination card or veterinary certificate at check-in.',
    'Puppies must have completed their full vaccination schedule before boarding.',
    'These requirements exist to protect every guest under our roof.',
  ],
  disclaimer:
    'Vaccination requirements may vary depending on your veterinarian\'s recommendations and current health regulations. When in doubt, please confirm with us and your vet before booking.',
};

// --- Boarding Policies -----------------------------------------------------
export const policies = [
  { title: 'Check-in & Check-out',         text: 'By appointment so we can welcome each guest unhurried. We will confirm exact times when you book.' },
  { title: 'Socialisation & Temperament',  text: 'All guests must be well-socialised with people and other dogs. A short temperament assessment may be arranged for first-time stays.' },
  { title: 'Trial Stays',                  text: 'For nervous or first-time boarders, we offer short trial stays so your dog can meet us and the pack before a longer booking.' },
  { title: 'Emergency Vet Authorisation',  text: 'Owners authorise us to seek immediate veterinary care if needed. We always attempt to reach you and your nominated emergency contact first.' },
  { title: 'Feeding',                      text: 'We feed your dog\'s own food on their existing schedule. Sudden diet changes can upset small breeds, so consistency comes first.' },
  { title: 'Medication',                   text: 'Routine medication is administered by trained staff and logged daily. Please supply pre-portioned doses with written instructions.' },
  { title: 'Holiday Season',               text: 'Festive seasons book out quickly. Reserve early and note any deposit, peak-rate or minimum-stay requirements at the time of booking.' },
  { title: 'Cancellations',                text: 'Please give as much notice as possible. Specific cancellation terms (especially over peak periods) are shared at the time of booking.' },
];

// --- FAQ -------------------------------------------------------------------
export const faqs = [
  { q: 'Is Pawsome 4 Pets really kennel-free?',           a: 'Yes — completely. Our guests live inside our home with us. There are no cages, runs or kennel structures anywhere on the property.' },
  { q: 'Where do the dogs sleep?',                        a: 'Indoors, on soft beds (and often on the couch). Where appropriate, smaller dogs may even sleep in the bedroom — they are family while they are with us.' },
  { q: 'Can I bring my dog\'s own food?',                 a: 'Yes, please do. We strongly prefer to feed your dog their usual food on their usual schedule — small breeds especially do not enjoy sudden diet changes.' },
  { q: 'What happens in an emergency?',                   a: 'We follow a clear protocol: we call you first, then your emergency contact, then transport your dog to a trusted vet. Owners pre-authorise emergency care at intake.' },
  { q: 'Do you accept puppies?',                          a: 'Yes — once they have completed their full vaccination schedule. We will confirm this with your vaccination card at check-in.' },
  { q: 'Do you separate dogs by size?',                   a: 'We only board small and toy-breed dogs, so the pack is always like-sized. This keeps play safe and stress-free.' },
  { q: 'Are the dogs supervised around the clock?',       a: 'There is always a human in the home with the dogs — that is the entire point of being kennel-free. Day and night.' },
  { q: 'What should I pack?',                             a: 'See our What to Bring guide. In short: their food, any medication, vaccination card, harness & lead, and a favourite blanket or toy.' },
];