import { useState } from 'react';
import { apiFetch, getToken } from '../lib/api';
import { evaluateField } from '../lib/formLogic';

const inputBase =
  'mt-2 w-full rounded-xl border border-beige bg-white/70 px-4 py-3 text-sm text-charcoal outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/20';

export default function DynamicField({ field, value, required, onChange, onFileUpload }) {
  const { type, label, placeholder, helpText, options, validation } = field;
  const name = field.fieldKey;

  const opts = Array.isArray(options) ? options : (options?.choices || []);

  // Section headers are layout-only and don't capture a value.
  if (type === 'section' || type === 'heading') {
    return (
      <div className="border-b border-beige/60 pb-3 pt-4">
        <h3 className="font-serif text-xl text-charcoal">{label}</h3>
        {helpText && <p className="mt-1 whitespace-pre-wrap text-sm text-cocoa">{helpText}</p>}
      </div>
    );
  }

  // Sub-headings inside a section.
  if (type === 'subheading') {
    return (
      <div className="pt-2">
        <h4 className="font-serif text-base font-semibold text-charcoal">{label}</h4>
        {helpText && <p className="mt-1 whitespace-pre-wrap text-sm text-cocoa">{helpText}</p>}
      </div>
    );
  }

  // Read-only paragraph (used for terms, policies, instructions).
  if (type === 'paragraph') {
    return (
      <div className="rounded-xl bg-cream/40 p-4 text-sm leading-relaxed text-cocoa">
        {label && <p className="mb-2 font-semibold text-charcoal">{label}</p>}
        {helpText && <p className="whitespace-pre-wrap">{helpText}</p>}
      </div>
    );
  }

  // Repeating section. `options` carries { fields, minInstances, maxInstances, addLabel }.
  if (type === 'repeater') {
    const config = options && !Array.isArray(options) ? options : { fields: [] };
    const innerFields = Array.isArray(config.fields) ? config.fields : [];
    const min = Number(config.minInstances ?? 1);
    const max = Number(config.maxInstances ?? 10);
    const addLabel = config.addLabel || `Add ${label || 'Item'}`;
    const itemLabel = label || 'Item';
    const instances = Array.isArray(value) && value.length
      ? value
      : Array.from({ length: Math.max(min, 1) }, () => ({}));

    const setInstance = (i, patch) => {
      const next = instances.map((x, j) => (j === i ? { ...x, ...patch } : x));
      onChange(next);
    };

    return (
      <div className="space-y-5">
        <div>
          <h3 className="font-serif text-2xl text-charcoal">
            {itemLabel}{required && <span className="text-coral"> *</span>}
          </h3>
          {helpText && <p className="mt-1 whitespace-pre-wrap text-sm text-cocoa">{helpText}</p>}
        </div>

        {instances.map((inst, i) => (
          <div key={i} className="space-y-5 rounded-2xl border border-beige/60 bg-cream/30 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-beige/60 pb-3">
              <h4 className="font-serif text-lg text-charcoal">{itemLabel} {i + 1}</h4>
              {instances.length > min && (
                <button
                  type="button"
                  onClick={() => onChange(instances.filter((_, j) => j !== i))}
                  className="text-sm text-coral underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            {innerFields.map((subField) => {
              const { visible, required: subRequired } = evaluateField(subField, inst);
              if (!visible) return null;
              return (
                <DynamicField
                  key={subField.fieldKey}
                  field={subField}
                  value={inst[subField.fieldKey]}
                  required={subRequired}
                  onChange={(v) => setInstance(i, { [subField.fieldKey]: v })}
                  onFileUpload={(u) => setInstance(i, { [subField.fieldKey]: u })}
                />
              );
            })}
          </div>
        ))}

        {instances.length < max && (
          <button
            type="button"
            onClick={() => onChange([...instances, {}])}
            className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition-colors hover:bg-corallt"
          >
            <span>+</span> {addLabel}
          </button>
        )}
      </div>
    );
  }

  const Label = (
    <span className="text-sm font-medium text-charcoal">
      {label}{required && <span className="text-coral"> *</span>}
    </span>
  );

  let control;
  switch (type) {
    case 'textarea':
      control = (
        <textarea
          name={name}
          value={value || ''}
          required={required}
          rows={4}
          placeholder={placeholder || ''}
          className={inputBase}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'select':
      control = (
        <select
          name={name}
          value={value || ''}
          required={required}
          className={inputBase}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Select an option</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case 'radio':
      control = (
        <div className="mt-2 flex flex-wrap gap-3">
          {opts.map((o) => (
            <label key={o} className="flex items-center gap-2 rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal">
              <input type="radio" name={name} value={o} checked={value === o} required={required} onChange={(e) => onChange(e.target.value)} />
              {o}
            </label>
          ))}
        </div>
      );
      break;
    case 'checkbox':
      if (opts.length) {
        const arr = Array.isArray(value) ? value : (value ? String(value).split(',') : []);
        control = (
          <div className="mt-2 flex flex-wrap gap-3">
            {opts.map((o) => {
              const checked = arr.includes(o);
              return (
                <label key={o} className="flex items-center gap-2 rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked ? arr.filter((x) => x !== o) : [...arr, o];
                      onChange(next);
                    }}
                  />
                  {o}
                </label>
              );
            })}
          </div>
        );
      } else {
        control = (
          <label className="mt-2 flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
            {placeholder || label}
          </label>
        );
      }
      break;
    case 'file':
      control = <FileInput field={field} onUpload={onFileUpload} value={value} />;
      break;
    case 'date':
    case 'time':
    case 'datetime-local':
    case 'number':
    case 'tel':
    case 'email':
    case 'url':
    case 'password':
    case 'text':
    default:
      control = (
        <input
          type={type || 'text'}
          name={name}
          value={value || ''}
          required={required}
          placeholder={placeholder || ''}
          minLength={validation?.minLength}
          maxLength={validation?.maxLength}
          min={validation?.min}
          max={validation?.max}
          pattern={validation?.pattern}
          className={inputBase}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <label className="block">
      {Label}
      {control}
      {helpText && <p className="mt-1.5 text-xs text-cocoa">{helpText}</p>}
    </label>
  );
}

function FileInput({ field, onUpload, value }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(value || null);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fieldKey', field.fieldKey);
    try {
      const token = getToken();
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setUploaded(json);
      onUpload(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <input type="file" onChange={handleChange} className="block w-full text-sm text-cocoa file:mr-3 file:rounded-full file:border-0 file:bg-coral file:px-4 file:py-2 file:text-cream hover:file:bg-corallt" />
      {uploading && <p className="text-xs text-cocoa">Uploading…</p>}
      {error && <p className="text-xs text-coral">{error}</p>}
      {uploaded && !uploading && (
        <p className="text-xs text-cocoa">Uploaded: <span className="font-medium text-charcoal">{uploaded.originalName}</span></p>
      )}
    </div>
  );
}
