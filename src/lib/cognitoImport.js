// Parse a Cognito Forms backup/export JSON and map it to our form schema.
//
// Cognito exports vary by version: top-level "Items" or "Pages" → Items,
// PascalCase keys (Name, Label, Required, Choices) and occasional camelCase.
// This parser is intentionally lenient about casing and key aliases so a wide
// range of exports flows through without manual edits.

// Cognito field type (lower-cased, stripped of whitespace/underscores/hyphens)
// → our internal field type. Anything missing falls back to 'text'.
const FIELD_TYPE_MAP = {
  text: 'text',
  textbox: 'text',
  shortanswer: 'text',
  textarea: 'textarea',
  longanswer: 'textarea',
  multilinetext: 'textarea',
  paragraph: 'paragraph',
  contentblock: 'paragraph',
  content: 'paragraph',
  htmlblock: 'paragraph',
  richtext: 'paragraph',
  section: 'section',
  page: 'section',
  subheading: 'subheading',
  heading: 'section',
  email: 'email',
  emailaddress: 'email',
  phone: 'tel',
  phonenumber: 'tel',
  tel: 'tel',
  number: 'number',
  currency: 'number',
  rating: 'number',
  date: 'date',
  datetime: 'date',
  time: 'text',
  dropdown: 'select',
  choicelist: 'select',
  select: 'select',
  radiobuttons: 'radio',
  radio: 'radio',
  checkbox: 'checkbox',
  checkboxes: 'checkbox',
  checkboxlist: 'checkbox',
  multiplechoice: 'checkbox',
  fileupload: 'file',
  file: 'file',
  yesno: 'radio',
  url: 'url',
  website: 'url',
  password: 'password',
  // Things we can't replicate verbatim — degrade sensibly.
  signature: 'text',
  address: 'textarea',
  name: 'text',
  calculation: 'text',
};

function lc(s) { return String(s ?? '').toLowerCase(); }
function typeKey(v) { return lc(v).replace(/[\s_-]/g, ''); }

function pickFirst(obj, ...keys) {
  for (const k of keys) {
    if (obj == null) continue;
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

function asBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return /^(true|yes|y|1)$/i.test(v);
  return false;
}

function slugifyKey(s) {
  const base = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return base || `field_${Math.random().toString(36).slice(2, 8)}`;
}

// Walk Items recursively, emitting fields in order. Sections that have their
// own label are emitted as a section heading; nested items follow.
function flatten(items, out = []) {
  for (const item of items || []) {
    if (!item || typeof item !== 'object') continue;

    const rawType = typeKey(pickFirst(item, 'Type', 'type', 'Kind', 'kind'));
    const children = pickFirst(item, 'Items', 'items', 'Fields', 'fields');

    if (Array.isArray(children)) {
      // Container (Section / Page / Group). Emit a heading if it has a label,
      // then recurse into children.
      const sectionLabel = pickFirst(item, 'Label', 'label', 'Title', 'title', 'Name', 'name');
      if (sectionLabel) {
        out.push({
          ...item,
          _ourType: rawType === 'page' || !rawType ? 'section' : (FIELD_TYPE_MAP[rawType] || 'section'),
          _isContainerHeading: true,
        });
      }
      flatten(children, out);
    } else {
      out.push(item);
    }
  }
  return out;
}

function mapItem(item) {
  const rawType = typeKey(pickFirst(item, 'Type', 'type', 'Kind', 'kind'));
  const ourType = item._isContainerHeading
    ? (item._ourType || 'section')
    : (FIELD_TYPE_MAP[rawType] || 'text');

  const label = String(
    pickFirst(item, 'Label', 'label', 'Title', 'title', 'Name', 'name') || 'Untitled',
  ).slice(0, 200);

  const baseKey = pickFirst(item, 'Name', 'name', 'FieldName', 'fieldName', 'Id', 'id', 'Label', 'label') || label;
  const fieldKey = slugifyKey(baseKey);

  const placeholder = String(pickFirst(item, 'Placeholder', 'placeholder', 'PlaceholderText') || '').slice(0, 200);
  const helpText = String(
    pickFirst(item, 'HelpText', 'helpText', 'Description', 'description', 'Hint', 'hint') || '',
  ).slice(0, 500);

  const required = asBool(pickFirst(item, 'Required', 'required', 'IsRequired', 'isRequired'));

  // Choices for select / radio / checkbox.
  let options = null;
  if (['select', 'radio', 'checkbox'].includes(ourType)) {
    const choices = pickFirst(item, 'Choices', 'choices', 'Options', 'options', 'Items', 'items') || [];
    options = (Array.isArray(choices) ? choices : [])
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c == null) return null;
        return pickFirst(c, 'Label', 'label', 'Text', 'text', 'Value', 'value', 'Name', 'name');
      })
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim());
    if (!options.length && rawType === 'yesno') options = ['Yes', 'No'];
  } else if (rawType === 'yesno') {
    options = ['Yes', 'No'];
  }

  return {
    fieldKey,
    label,
    type: ourType,
    placeholder,
    helpText,
    isRequired: required,
    options,
    validation: null,
    conditions: [],
    _sourceType: rawType || 'text',
  };
}

// De-dupe field keys (Cognito Names sometimes collide after slugifying).
function dedupeKeys(fields) {
  const seen = new Map();
  return fields.map((f) => {
    const base = f.fieldKey;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? f : { ...f, fieldKey: `${base}_${n}` };
  });
}

export function parseCognitoForm(input) {
  let data;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Paste the Cognito Forms backup JSON, or upload a .json file.');
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(`Invalid JSON: ${err.message}`);
    }
  } else if (input && typeof input === 'object') {
    data = input;
  } else {
    throw new Error('No data to import.');
  }

  // Some exports wrap the form: { Form: {...} } or { form: {...} }
  if (data.Form && typeof data.Form === 'object') data = data.Form;
  else if (data.form && typeof data.form === 'object') data = data.form;

  const title = String(
    pickFirst(data, 'Name', 'name', 'Title', 'title') || 'Imported form',
  ).slice(0, 200);
  const description = String(
    pickFirst(data, 'Description', 'description', 'Intro', 'intro') || '',
  ).slice(0, 5000);

  // Collect items from Items[] and/or Pages[].Items[].
  const collected = [];
  const topItems = pickFirst(data, 'Items', 'items', 'Fields', 'fields');
  if (Array.isArray(topItems)) flatten(topItems, collected);
  const pages = pickFirst(data, 'Pages', 'pages');
  if (Array.isArray(pages)) {
    for (const page of pages) {
      const pageItems = pickFirst(page, 'Items', 'items', 'Fields', 'fields');
      if (Array.isArray(pageItems)) flatten(pageItems, collected);
    }
  }

  const fields = dedupeKeys(collected.map(mapItem).filter(Boolean));
  return { title, description, fields };
}
