import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch, getToken } from '../../lib/api';

const PAGE_SIZES = [25, 50, 100, 200];

export default function AdminSubmissions() {
  const [params, setParams] = useSearchParams();
  const formId = params.get('formId') || '';
  const initialSearch = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page') || '1'));
  const pageSize = PAGE_SIZES.includes(Number(params.get('limit')))
    ? Number(params.get('limit'))
    : 50;

  const [forms, setForms] = useState([]);
  const [data, setData] = useState({ submissions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const selectAllRef = useRef(null);

  useEffect(() => {
    apiFetch('/admin/forms').then((d) => setForms(d.forms)).catch(() => {});
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch); else next.delete('q');
    next.delete('page');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (formId) qs.set('formId', formId);
    if (debouncedSearch) qs.set('q', debouncedSearch);
    qs.set('limit', String(pageSize));
    qs.set('offset', String((page - 1) * pageSize));
    apiFetch(`/admin/submissions?${qs.toString()}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [formId, debouncedSearch, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const goToPage = (n) => {
    const next = new URLSearchParams(params);
    if (n === 1) next.delete('page'); else next.set('page', String(n));
    setParams(next);
  };

  const changePageSize = (n) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (n === 50) next.delete('limit'); else next.set('limit', String(n));
    setParams(next);
  };

  // ── Checkbox selection ───────────────────────────────────────────────────────
  const pageIds = data.submissions.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) { pageIds.forEach((id) => next.delete(id)); }
      else { pageIds.forEach((id) => next.add(id)); }
      return next;
    });
  };

  // ── Downloads ────────────────────────────────────────────────────────────────
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

  const exportSelected = () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    fetch('/api/exports/submissions/bundle.pdf', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds] }),
    })
      .then((r) => r.ok ? r.blob() : r.json().then((j) => { throw new Error(j.error || 'Export failed'); }))
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'selected-submissions.pdf';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => alert(e.message))
      .finally(() => setExporting(false));
  };

  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, data.total);

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
          {selectedIds.size > 0 && (
            <button
              onClick={exportSelected}
              disabled={exporting}
              className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral/85 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {exporting ? 'Exporting…' : `Export ${selectedIds.size} selected (PDF)`}
            </button>
          )}
        </div>

        {!loading && data.total > 0 && (
          <p className="mt-3 text-xs text-cocoa">
            {debouncedSearch
              ? <>{data.total} submission{data.total === 1 ? '' : 's'} match <span className="font-mono">"{debouncedSearch}"</span>.</>
              : <>{data.total} submission{data.total === 1 ? '' : 's'} total.</>}
            {selectedIds.size > 0 && (
              <> · <span className="font-semibold text-coral">{selectedIds.size} selected</span>
              {' '}<button onClick={() => setSelectedIds(new Set())} className="underline hover:text-coral">clear</button></>
            )}
          </p>
        )}
        {debouncedSearch && !loading && data.total === 0 && (
          <p className="mt-3 text-xs text-cocoa">
            No submissions match <span className="font-mono">"{debouncedSearch}"</span>.
          </p>
        )}

        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-cocoa">Loading…</p>
          ) : data.submissions.length === 0 ? (
            <p className="text-sm text-cocoa">{debouncedSearch ? 'No matches.' : 'No submissions found.'}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-cocoa">
                  <th className="w-8 py-2 pr-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer rounded accent-coral"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Form</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2 pr-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige/40">
                {data.submissions.map((s) => (
                  <tr key={s.id} className={`text-charcoal transition-colors ${selectedIds.has(s.id) ? 'bg-coral/5' : ''}`}>
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleRow(s.id)}
                        className="h-4 w-4 cursor-pointer rounded accent-coral"
                      />
                    </td>
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

        {!loading && data.total > pageSize && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-beige/40 pt-4">
            <div className="flex items-center gap-2 text-sm text-cocoa">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="rounded-lg border border-beige bg-white/70 px-2 py-1 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-cocoa">
                {firstRow}–{lastRow} of {data.total}
              </span>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="rounded-full border border-charcoal/30 bg-white/70 px-3 py-1.5 text-sm font-semibold text-charcoal transition-colors hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="text-sm text-cocoa">Page {page} of {totalPages}</span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-full border border-charcoal/30 bg-white/70 px-3 py-1.5 text-sm font-semibold text-charcoal transition-colors hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
