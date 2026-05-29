import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import SEO from '../../components/SEO';
import Button from '../../components/Button';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import DynamicField from '../../components/DynamicField';
import { evaluateField } from '../../lib/formLogic';
import { apiFetch } from '../../lib/api';

const FIELD_TYPES = [
  { value: 'section',    label: 'Section heading' },
  { value: 'subheading', label: 'Sub-heading' },
  { value: 'paragraph',  label: 'Paragraph / terms text' },
  { value: 'text',       label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email',    label: 'Email' },
  { value: 'tel',      label: 'Phone' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'radio',    label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'file',     label: 'File upload' },
  { value: 'url',      label: 'URL' },
  { value: 'password', label: 'Password' },
];

const OPERATORS = [
  { value: 'equals',    label: 'equals' },
  { value: 'notEquals', label: 'not equals' },
  { value: 'contains',  label: 'contains' },
  { value: 'gt',        label: 'greater than' },
  { value: 'lt',        label: 'less than' },
  { value: 'in',        label: 'is one of (comma-separated)' },
];

const ACTIONS = [
  { value: 'show',      label: 'show this field' },
  { value: 'hide',      label: 'hide this field' },
  { value: 'require',   label: 'require this field' },
  { value: 'unrequire', label: 'make optional' },
];

const inputCls = 'w-full rounded-lg border border-beige bg-white/80 px-3 py-2 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20';

function freshField() {
  return {
    _localId: `new_${Math.random().toString(36).slice(2, 9)}`,
    fieldKey: `field_${Date.now().toString(36)}`,
    label: 'Untitled field',
    type: 'text',
    placeholder: '',
    helpText: '',
    isRequired: false,
    options: null,
    validation: null,
    conditions: [],
  };
}

export default function AdminFormEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    apiFetch(`/admin/forms/${id}`).then((d) => {
      setForm(d.form);
      setFields(d.form.fields.map((f) => ({ ...f, conditions: f.conditions || [] })));
    }).catch((e) => setError(e.message));
  }, [id]);

  const updateForm = async (changes) => {
    const { form: updated } = await apiFetch(`/admin/forms/${id}`, { method: 'PUT', body: changes });
    setForm({ ...form, ...updated });
  };

  const saveAll = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await apiFetch(`/admin/forms/${id}/fields`, { method: 'PUT', body: { fields } });
      setSuccess('Saved.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const addField = () => setFields((fs) => [...fs, freshField()]);
  const removeField = (idx) => setFields((fs) => fs.filter((_, i) => i !== idx));
  const updateField = (idx, changes) => setFields((fs) => fs.map((f, i) => i === idx ? { ...f, ...changes } : f));

  const onDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => keyOf(f) === active.id);
    const newIdx = fields.findIndex((f) => keyOf(f) === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setFields((fs) => arrayMove(fs, oldIdx, newIdx));
  };

  const togglePublish = async () => {
    try {
      await updateForm({ isPublished: !form.isPublished });
    } catch (err) { setError(err.message); }
  };

  if (!form) {
    return error
      ? <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
      : <p className="text-sm text-cocoa">Loading…</p>;
  }

  return (
    <>
      <SEO title={`Admin · ${form.title}`} />
      <PageHeader
        title={form.title}
        subtitle={<>Slug: <code className="font-mono text-xs">{form.slug}</code></>}
        actions={
          <>
            <Link to="/admin/forms" className="text-sm text-cocoa hover:text-coral">← Back to forms</Link>
            <Button variant="outline" type="button" onClick={() => setPreview((p) => !p)}>
              {preview ? 'Edit fields' : 'Preview'}
            </Button>
            <button
              onClick={togglePublish}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                form.isPublished ? 'bg-gold text-cream hover:bg-goldlt' : 'bg-charcoal text-cream hover:bg-charcoal/85'
              }`}
            >
              {form.isPublished ? 'Published' : 'Publish'}
            </button>
            <Button type="button" onClick={saveAll} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      />

      {error && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
      {success && <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">{success}</div>}

      {preview ? (
        <Card title="Live preview">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert('Preview only — use the public URL to submit.'); }}>
            {fields.map((f) => {
              const { visible, required } = evaluateField(f, previewAnswers);
              if (!visible) return null;
              return (
                <DynamicField
                  key={keyOf(f)}
                  field={f}
                  value={previewAnswers[f.fieldKey]}
                  required={required}
                  onChange={(v) => setPreviewAnswers((a) => ({ ...a, [f.fieldKey]: v }))}
                  onFileUpload={() => {}}
                />
              );
            })}
            <Button type="submit" className="w-full sm:w-auto">Submit (preview)</Button>
          </form>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => setActiveId(e.active.id)}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <SortableContext items={fields.map(keyOf)} strategy={verticalListSortingStrategy}>
                {fields.length === 0 ? (
                  <Card><p className="text-sm text-cocoa">No fields yet. Add one from the right.</p></Card>
                ) : fields.map((field, idx) => (
                  <SortableFieldEditor
                    key={keyOf(field)}
                    id={keyOf(field)}
                    field={field}
                    isActive={activeId === keyOf(field)}
                    onChange={(c) => updateField(idx, c)}
                    onRemove={() => removeField(idx)}
                    otherFields={fields.filter((_, i) => i !== idx)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:self-start lg:pr-1">
            <Card title="Form settings">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-cocoa">Title</span>
                  <input
                    className={`${inputCls} mt-1`}
                    defaultValue={form.title}
                    onBlur={(e) => updateForm({ title: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-cocoa">Slug</span>
                  <input
                    className={`${inputCls} mt-1 font-mono`}
                    defaultValue={form.slug}
                    onBlur={(e) => updateForm({ slug: e.target.value })}
                  />
                  <span className="mt-1 block text-xs text-cocoa">Public URL: /forms/{form.slug}</span>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-cocoa">Description</span>
                  <textarea
                    rows={2}
                    className={`${inputCls} mt-1`}
                    defaultValue={form.description || ''}
                    onBlur={(e) => updateForm({ description: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-cocoa">Success message</span>
                  <textarea
                    rows={2}
                    className={`${inputCls} mt-1`}
                    defaultValue={form.successMessage || ''}
                    onBlur={(e) => updateForm({ successMessage: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    defaultChecked={form.createsAccount}
                    onChange={(e) => updateForm({ createsAccount: e.target.checked })}
                  />
                  Auto-create user account on submit
                </label>
              </div>
            </Card>

            <Card title="Add a field">
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFields((fs) => [...fs, { ...freshField(), type: t.value, label: t.label }])}
                    className="rounded-lg border border-beige bg-white/70 px-3 py-2 text-left text-xs font-medium text-charcoal hover:border-coral hover:text-coral"
                  >
                    + {t.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex justify-between text-sm">
                <span className="text-cocoa">Public URL</span>
                <a
                  href={`/forms/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold ${form.isPublished ? 'text-coral hover:underline' : 'pointer-events-none text-cocoa'}`}
                >
                  {form.isPublished ? 'Open' : 'Publish first'}
                </a>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

function keyOf(f) {
  return f.id ? `db_${f.id}` : f._localId;
}

function SortableFieldEditor({ id, field, onChange, onRemove, otherFields, isActive }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const isChoice = ['select', 'radio', 'checkbox'].includes(field.type);
  const opts = Array.isArray(field.options) ? field.options : (field.options?.choices || []);

  return (
    <div ref={setNodeRef} style={style} className={`rounded-2xl border bg-white/70 p-5 shadow-glass ${isActive ? 'border-coral' : 'border-beige/40'}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab rounded-md p-1 text-cocoa hover:bg-beige/40 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/>
            <circle cx="16" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
          </svg>
        </button>

        <div className="flex-1 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_140px]">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cocoa">Label</span>
              <input className={`${inputCls} mt-1`} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cocoa">Type</span>
              <select className={`${inputCls} mt-1`} value={field.type} onChange={(e) => onChange({ type: e.target.value })}>
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cocoa">Key</span>
              <input className={`${inputCls} mt-1 font-mono`} value={field.fieldKey} onChange={(e) => onChange({ fieldKey: e.target.value })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cocoa">Placeholder</span>
              <input className={`${inputCls} mt-1`} value={field.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cocoa">Help text</span>
              <input className={`${inputCls} mt-1`} value={field.helpText || ''} onChange={(e) => onChange({ helpText: e.target.value })} />
            </label>
          </div>

          {isChoice && (
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cocoa">Options (one per line)</span>
              <textarea
                rows={3}
                className={`${inputCls} mt-1`}
                value={opts.join('\n')}
                onChange={(e) => onChange({ options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={!!field.isRequired} onChange={(e) => onChange({ isRequired: e.target.checked })} />
            Required
          </label>

          <ConditionsEditor field={field} otherFields={otherFields} onChange={onChange} />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-cocoa hover:text-coral"
          aria-label="Remove field"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ConditionsEditor({ field, otherFields, onChange }) {
  const list = field.conditions || [];

  const add = () => onChange({ conditions: [...list, { dependsOnKey: otherFields[0]?.fieldKey || '', operator: 'equals', value: '', action: 'show' }] });
  const update = (i, c) => onChange({ conditions: list.map((x, j) => j === i ? { ...x, ...c } : x) });
  const remove = (i) => onChange({ conditions: list.filter((_, j) => j !== i) });

  return (
    <details className="rounded-xl bg-cream/60 p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-cocoa">
        Conditional logic{list.length ? ` · ${list.length}` : ''}
      </summary>
      <div className="mt-3 space-y-3">
        {otherFields.length === 0 ? (
          <p className="text-xs text-cocoa">Add another field first, then you can react to its value.</p>
        ) : (
          <>
            {list.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_130px_1fr_140px_auto] sm:items-center">
                <select className={inputCls} value={c.dependsOnKey} onChange={(e) => update(i, { dependsOnKey: e.target.value })}>
                  {otherFields.map((o) => <option key={o.fieldKey} value={o.fieldKey}>{o.label} ({o.fieldKey})</option>)}
                </select>
                <select className={inputCls} value={c.operator} onChange={(e) => update(i, { operator: e.target.value })}>
                  {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className={inputCls} value={c.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="value" />
                <select className={inputCls} value={c.action} onChange={(e) => update(i, { action: e.target.value })}>
                  {ACTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={() => remove(i)} className="text-sm text-cocoa hover:text-coral">Remove</button>
              </div>
            ))}
            <button type="button" onClick={add} className="text-sm font-semibold text-coral hover:underline">+ Add condition</button>
          </>
        )}
      </div>
    </details>
  );
}
