import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import Button from '../../components/Button';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch } from '../../lib/api';

const inputCls = 'w-full rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20';

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminForms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [templateId, setTemplateId] = useState('');

  const slugPreview = useMemo(
    () => slugify(newSlug) || slugify(newTitle) || 'your-form',
    [newSlug, newTitle],
  );

  const load = () =>
    apiFetch('/admin/forms')
      .then((d) => setForms(d.forms))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      const body = { title: newTitle.trim() };
      if (newDescription.trim()) body.description = newDescription.trim();
      if (newSlug.trim()) body.slug = newSlug.trim();

      const { form } = await apiFetch('/admin/forms', { method: 'POST', body });

      if (templateId) {
        try {
          const { form: source } = await apiFetch(`/admin/forms/${templateId}`);
          const clonedFields = (source.fields || []).map((f) => ({
            fieldKey: f.fieldKey,
            label: f.label,
            type: f.type,
            placeholder: f.placeholder ?? '',
            helpText: f.helpText ?? '',
            isRequired: !!f.isRequired,
            options: f.options ?? null,
            validation: f.validation ?? null,
            conditions: (f.conditions || []).map((c) => ({
              dependsOnKey: c.dependsOnKey,
              operator: c.operator,
              value: c.value,
              action: c.action,
            })),
          }));
          if (clonedFields.length) {
            await apiFetch(`/admin/forms/${form.id}/fields`, {
              method: 'PUT',
              body: { fields: clonedFields },
            });
          }
        } catch (cloneErr) {
          // Form was created; surface the clone failure but still continue to the editor.
          setError(`Form created, but copying template failed: ${cloneErr.message}`);
        }
      }

      navigate(`/admin/forms/${form.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewSlug('');
    setTemplateId('');
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this form and all its submissions?')) return;
    try {
      await apiFetch(`/admin/forms/${id}`, { method: 'DELETE' });
      setForms((fs) => fs.filter((f) => f.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <SEO title="Admin · Forms" />
      <PageHeader
        title="Forms"
        subtitle="Build, publish and manage your dynamic forms."
      />

      {error && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}

      <Card title="Create a new form">
        <form onSubmit={create} className="space-y-5">
          <p className="text-sm text-cocoa">
            Give your form a name to get started — you can add and arrange fields after.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
                Form title <span className="text-coral">*</span>
              </span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. New Client Application"
                className={`${inputCls} mt-1`}
                required
                autoFocus
              />
              <span className="mt-1 block text-xs text-cocoa">
                Shown at the top of the form to people filling it in.
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
                Public URL <span className="text-cocoa/60">(optional)</span>
              </span>
              <div className="mt-1 flex overflow-hidden rounded-xl border border-beige bg-white/70 transition-colors focus-within:border-coral focus-within:ring-2 focus-within:ring-coral/20">
                <span className="select-none whitespace-nowrap bg-beige/40 px-3 py-2.5 font-mono text-sm text-cocoa">
                  /forms/
                </span>
                <input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder={slugify(newTitle) || 'auto-generated'}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-charcoal outline-none"
                />
              </div>
              <span className="mt-1 block text-xs text-cocoa">
                Preview: <code className="font-mono">/forms/{slugPreview}</code>
              </span>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
              Description <span className="text-cocoa/60">(optional)</span>
            </span>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A short intro shown above the form, e.g. 'Tell us about your pet so we can match the right care plan.'"
              className={`${inputCls} mt-1`}
            />
          </label>

          {forms.length > 0 && (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
                Start from a template <span className="text-cocoa/60">(optional)</span>
              </span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className={`${inputCls} mt-1`}
              >
                <option value="">Blank form — no fields yet</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} · {f._count?.fields ?? 0} field{(f._count?.fields ?? 0) === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-cocoa">
                Copies all fields and conditional logic from the chosen form. You can edit everything after.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-beige/40 pt-4">
            {(newTitle || newDescription || newSlug || templateId) && (
              <button
                type="button"
                onClick={resetForm}
                disabled={creating}
                className="text-sm text-cocoa hover:text-coral disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <Button type="submit" disabled={creating || !newTitle.trim()}>
              {creating ? 'Creating…' : 'Create form'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Card
          title="Import from Cognito Forms"
          action={
            <Link to="/admin/import" className="text-sm font-semibold text-coral hover:underline">
              Open importer →
            </Link>
          }
        >
          <p className="text-sm text-cocoa">
            Bring an existing form across — either the Cognito JSON backup
            (<span className="font-mono">Settings → Backup</span>) or an Excel entries export
            (<span className="font-mono">.xlsx</span>). The importer lives on its own page so you
            can preview the parsed fields before they're created.
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <Card title={`${forms.length} form${forms.length === 1 ? '' : 's'}`}>
          {loading ? (
            <p className="text-sm text-cocoa">Loading…</p>
          ) : forms.length === 0 ? (
            <p className="text-sm text-cocoa">No forms yet. Create one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-cocoa">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4">Fields</th>
                    <th className="py-2 pr-4">Submissions</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige/40">
                  {forms.map((f) => (
                    <tr key={f.id} className="text-charcoal">
                      <td className="py-3 pr-4">
                        <Link to={`/admin/forms/${f.id}`} className="font-medium hover:text-coral">{f.title}</Link>
                      </td>
                      <td className="py-3 pr-4 text-cocoa">{f.slug}</td>
                      <td className="py-3 pr-4">{f._count?.fields ?? 0}</td>
                      <td className="py-3 pr-4">{f._count?.submissions ?? 0}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          f.isPublished ? 'bg-gold/20 text-gold' : 'bg-beige/40 text-cocoa'
                        }`}>
                          {f.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {f.isPublished && (
                          <a href={`/forms/${f.slug}`} target="_blank" rel="noopener noreferrer"
                             className="mr-3 text-sm text-cocoa hover:text-coral">View</a>
                        )}
                        <Link to={`/admin/forms/${f.id}`} className="mr-3 text-sm text-coral hover:underline">Edit</Link>
                        <button onClick={() => remove(f.id)} className="text-sm text-cocoa hover:text-coral">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
