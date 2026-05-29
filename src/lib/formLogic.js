// Evaluate a field's visibility and "required" state given the current answers
// and the field's conditions. Conditions are evaluated in order; the last
// matching action wins. Unmatched fields keep their default state.

function compare(actual, operator, expected) {
  const a = actual === undefined || actual === null ? '' : String(actual);
  const b = expected === undefined || expected === null ? '' : String(expected);
  switch (operator) {
    case 'equals':     return a === b;
    case 'notEquals':  return a !== b;
    case 'contains':   return a.toLowerCase().includes(b.toLowerCase());
    case 'gt':         return Number(a) >  Number(b);
    case 'lt':         return Number(a) <  Number(b);
    case 'in':         return b.split(',').map((s) => s.trim()).includes(a);
    default:           return false;
  }
}

export function evaluateField(field, answers) {
  let visible = true;
  let required = !!field.isRequired;
  if (!field.conditions?.length) return { visible, required };

  for (const c of field.conditions) {
    const matches = compare(answers[c.dependsOnKey], c.operator, c.value);
    if (!matches) continue;
    switch (c.action) {
      case 'show':       visible = true;  break;
      case 'hide':       visible = false; break;
      case 'require':    required = true; break;
      case 'unrequire':  required = false; break;
    }
  }
  return { visible, required };
}
