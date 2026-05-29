import { useEffect, useMemo, useState } from 'react';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/Button';
import { apiFetch } from '../../lib/api';

const inputCls = 'w-full rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20';

const NAV_NEW_CLIENT_KEY = 'nav.newClientFormSlug';
const PUBLIC_FORMS_NAV_KEY = 'public.formsNav';

function parseSlugList(value) {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : [];
  } catch { return []; }
}

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [forms, setForms] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    try {
      const [s, f] = await Promise.all([
        apiFetch('/admin/settings'),
        apiFetch('/admin/forms'),
      ]);
      setSettings(s.settings);
      setForms(f.forms);
      setDraft(Object.fromEntries(s.settings.map((row) => [row.key, row.value])));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const currentValue = (key) => {
    const row = settings.find((r) => r.key === key);
    return row?.value ?? '';
  };

  const setDraftValue = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const saveKey = async (key, valueOverride) => {
    setSaving(key);
    setError('');
    setSavedMsg('');
    try {
      const value = valueOverride !== undefined ? valueOverride : (draft[key] ?? '');
      await apiFetch(`/admin/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value: String(value) } });
      // Refresh local settings without a full reload
      setSettings((rows) => {
        const existing = rows.find((r) => r.key === key);
        if (existing) return rows.map((r) => r.key === key ? { ...r, value: String(value) } : r);
        return [...rows, { key, value: String(value) }];
      });
      setDraft((d) => ({ ...d, [key]: String(value) }));
      setSavedMsg('Saved.');
      setTimeout(() => setSavedMsg(''), 1800);
    } catch (err) { setError(err.message); }
    finally { setSaving(''); }
  };

  const newClientSlug = draft[NAV_NEW_CLIENT_KEY] ?? currentValue(NAV_NEW_CLIENT_KEY);
  const navSlugs = useMemo(() => parseSlugList(draft[PUBLIC_FORMS_NAV_KEY] ?? currentValue(PUBLIC_FORMS_NAV_KEY)), [draft, settings]);

  const toggleNavForm = (slug) => {
    const next = navSlugs.includes(slug) ? navSlugs.filter((s) => s !== slug) : [...navSlugs, slug];
    const json = JSON.stringify(next);
    setDraftValue(PUBLIC_FORMS_NAV_KEY, json);
    saveKey(PUBLIC_FORMS_NAV_KEY, json);
  };

  const publishedForms = forms.filter((f) => f.isPublished);

  // Existing key/value settings, minus the two managed by the dedicated panels.
  const generalSettings = settings.filter((s) => s.key !== NAV_NEW_CLIENT_KEY && s.key !== PUBLIC_FORMS_NAV_KEY);

  return (
    <>
      <SEO title="Admin · Settings" />
      <PageHeader title="Settings" subtitle="Bind forms to site CTAs, control which forms appear publicly, and manage platform key/value config." />

      {error && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
      {savedMsg && <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">{savedMsg}</div>}

      {loading ? (
        <p className="text-sm text-cocoa">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Middle column — scrolls with the page */}
          <div className="space-y-6">
            <Card title="General">
              {generalSettings.length === 0 ? (
                <p className="text-sm text-cocoa">No general settings yet.</p>
              ) : (
                <ul className="space-y-5">
                  {generalSettings.map((s) => {
                    // Render boolean-valued settings as a true/false dropdown,
                    // string settings as a regular text input.
                    const isBoolean = s.value === 'true' || s.value === 'false';
                    return (
                      <li key={s.key} className="grid gap-2 sm:grid-cols-[200px_1fr_auto] sm:items-center">
                        <span className="font-mono text-xs text-cocoa">{s.key}</span>
                        {isBoolean ? (
                          <select
                            value={draft[s.key] ?? 'false'}
                            onChange={(e) => {
                              setDraftValue(s.key, e.target.value);
                              saveKey(s.key, e.target.value);
                            }}
                            className={inputCls}
                            disabled={saving === s.key}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            value={draft[s.key] ?? ''}
                            onChange={(e) => setDraftValue(s.key, e.target.value)}
                            className={inputCls}
                          />
                        )}
                        {isBoolean ? (
                          <span className="text-xs text-cocoa">{saving === s.key ? 'Saving…' : ' '}</span>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => saveKey(s.key)}
                            variant="outline"
                            disabled={saving === s.key || draft[s.key] === s.value}
                            className="px-4 py-2 text-xs"
                          >
                            {saving === s.key ? 'Saving…' : 'Save'}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="About settings">
              <p className="text-sm text-cocoa">
                The right-hand panel holds the most-used settings: which form opens
                from the <em>New Client</em> button across the site, and which forms
                appear in the public <em>Forms</em> tab. Both can be changed at any
                time and update the site immediately for new visits.
              </p>
            </Card>
          </div>

          {/* Right column — sticky form-binding panels */}
          <aside className="space-y-6 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:self-start lg:pr-1">
            <Card title="New Client button">
              <p className="mb-3 text-xs text-cocoa">
                The form opened when visitors click <strong>New Client</strong> in the
                navbar, footer, and CTAs.
              </p>
              <select
                value={newClientSlug || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraftValue(NAV_NEW_CLIENT_KEY, v);
                  saveKey(NAV_NEW_CLIENT_KEY, v);
                }}
                className={inputCls}
                disabled={saving === NAV_NEW_CLIENT_KEY}
              >
                <option value="">— Not bound —</option>
                {publishedForms.map((f) => (
                  <option key={f.id} value={f.slug}>{f.title}</option>
                ))}
                {forms.filter((f) => !f.isPublished).length > 0 && (
                  <optgroup label="Drafts (publish first)">
                    {forms.filter((f) => !f.isPublished).map((f) => (
                      <option key={f.id} value={f.slug} disabled>{f.title} (draft)</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {saving === NAV_NEW_CLIENT_KEY && <p className="mt-2 text-xs text-cocoa">Saving…</p>}
              {publishedForms.length === 0 && (
                <p className="mt-3 text-xs text-coral">
                  No published forms yet. Create one in <strong>Forms</strong> and publish it to bind it here.
                </p>
              )}
            </Card>

            <Card title="Public Forms tab">
              <p className="mb-3 text-xs text-cocoa">
                Tick forms to show them on the public <code className="font-mono">/forms</code> page and add a <strong>Forms</strong> link to the navbar.
              </p>
              {publishedForms.length === 0 ? (
                <p className="text-xs text-cocoa">No published forms to choose from.</p>
              ) : (
                <ul className="space-y-2">
                  {publishedForms.map((f) => {
                    const on = navSlugs.includes(f.slug);
                    return (
                      <li key={f.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-cream/70">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleNavForm(f.slug)}
                            className="mt-0.5"
                            disabled={saving === PUBLIC_FORMS_NAV_KEY}
                          />
                          <span className="flex-1 text-sm">
                            <span className="block font-medium text-charcoal">{f.title}</span>
                            <span className="block font-mono text-xs text-cocoa">/forms/{f.slug}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}
