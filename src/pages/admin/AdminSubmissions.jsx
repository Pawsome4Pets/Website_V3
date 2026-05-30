import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch, getToken } from '../../lib/api';

export default function AdminSubmissions() {
  const [params, setParams] = useSearchParams();
  const formId = params.get('formId') || '';
  const initialSearch = params.get('q') || '';
  const [forms, setForms] = useState([]);
  const [data, setData] = useState({ submissions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    apiFetch('/admin/forms').then((d) => setForms(d.forms)).catch(() => {});
  }, []);

  // Debounce the search input so each keystroke doesn't hit the server. 250ms
  // feels instant and keeps the answers-LIKE query rate-limited.
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Reflect the search term in the URL so refresh / bookmark keeps the filter.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch); else next.delete('q');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (formId) qs.set('formId', formId);
    if (debouncedSearch) qs.set('q', debouncedSearch);
    const suffix = qs.toString();
    apiFetch(`/admin/submissions${suffix ? `?${suffix}` : ''}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [formId, debouncedSearch]);

  // Server already filtered — keep a thin client filter only as a fallback
  // for status (status isn't searchable server-side and is cheap locally).
  const filtered = data.submissions;

  const download = (path, filename, errLabel) => {
    fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.ok ? r.blob() : r.json().then((j) => { throw new Error(j.error || `${errLabel} failed`); }))
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => alert(e.message));
  };

  const exportCsv = () => {
    if (!formId) { alert('Pick a specific form to export.'); return; }
    download(`/api/exports/forms/${formId}/submissions.csv`, `submissions-form-${formId}.csv`, 'CSV export');
  };

  const exportPdf = () => {
    if (!formId) { alert('Pick a specific form to export.'); return; }
    download(`/api/exports/forms/${formId}/submissions.pdf`, `submissions-form-${formId}.pdf`, 'PDF export');
  };

  return (
    <>
      <SEO title="Admin · Submissions" />
      <PageHeader
        title="Submissions"
        subtitle="View, filter and export everything submitted through your forms."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={formId}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setParams({ formId: v }); else setParams({});
            }}
            className="rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          >
            <option value="">All forms</option>
            {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by owner name, dog, email, phone…"
            className="min-w-0 flex-1 rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
          <button
            onClick={exportCsv}
            disabled={!formId}
            className="rounded-full border border-charcoal/30 bg-white/70 px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={exportPdf}
            disabled={!formId}
            className="rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-charcoal/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export PDF
          </button>
        </div>

        {debouncedSearch && !loading && (
          <p className="mt-3 text-xs text-cocoa">
            {data.total === 0
              ? <>No submissions match <span className="font-mono">"{debouncedSearch}"</span>.</>
              : <>{data.total} submission{data.total === 1 ? '' : 's'} match <span className="font-mono">"{debouncedSearch}"</span>.</>}
          </p>
        )}

        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-cocoa">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-cocoa">{debouncedSearch ? 'No matches.' : 'No submissions found.'}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-cocoa">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Form</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2 pr-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige/40">
                {filtered.map((s) => (
                  <tr key={s.id} className="text-charcoal">
                    <td className="py-3 pr-4 font-mono text-xs text-cocoa">{s.id}</td>
                    <td className="py-3 pr-4">
                      <Link to={`/admin/submissions/${s.id}`} className="font-medium hover:text-coral">{s.form?.title}</Link>
                    </td>
                    <td className="py-3 pr-4 text-cocoa">{s.user?.email || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        s.status === 'reviewed' ? 'bg-gold/20 text-gold' :
                        s.status === 'archived' ? 'bg-beige/40 text-cocoa' :
                        'bg-coral/15 text-coral'
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-cocoa">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right">
                      <Link to={`/admin/submissions/${s.id}`} className="text-sm text-coral hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </>
  );
}
