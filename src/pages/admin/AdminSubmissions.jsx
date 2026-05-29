import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch, getToken } from '../../lib/api';

export default function AdminSubmissions() {
  const [params, setParams] = useSearchParams();
  const formId = params.get('formId') || '';
  const [forms, setForms] = useState([]);
  const [data, setData] = useState({ submissions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/admin/forms').then((d) => setForms(d.forms)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = formId ? `?formId=${formId}` : '';
    apiFetch(`/admin/submissions${q}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [formId]);

  const filtered = data.submissions.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(s.id).includes(q) ||
      s.form?.title?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q) ||
      s.status.includes(q)
    );
  });

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
            placeholder="Search…"
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

        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-cocoa">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-cocoa">No submissions found.</p>
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
