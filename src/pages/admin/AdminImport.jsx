import { useEffect, useMemo, useState } from 'react';
import SEO from '../../components/SEO';
import Button from '../../components/Button';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch } from '../../lib/api';
import {
  parseExcelSubmissions,
  parseJsonSubmissions,
  autoMapColumns,
  remapRows,
  findConsentFieldKeys,
  extractAndReplicate,
  IMPORT_LIB_VERSION,
} from '../../lib/submissionsImport';

const inputCls =
  'w-full rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20';

export default function AdminImport() {
  // ── Available forms (the user picks the target before uploading) ──────────
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [formId, setFormId] = useState('');
  const [formDetail, setFormDetail] = useState(null); // full form (with fields) for the chosen id

  useEffect(() => {
    apiFetch('/admin/forms')
      .then((d) => setForms(d.forms || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingForms(false));
  }, []);

  useEffect(() => {
    if (!formId) { setFormDetail(null); return; }
    setFormDetail(null);
    apiFetch(`/admin/forms/${formId}`)
      .then((d) => setFormDetail(d.form))
      .catch((e) => setError(e.message));
  }, [formId]);

  // ── Parsed file state ─────────────────────────────────────────────────────
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);   // { columns, rows, ignoredMetaColumns, sourceLabel }
  const [mapping, setMapping] = useState({});   // { columnLabel: fieldKey | '' }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const [autoImport, setAutoImport] = useState(true);   // skip mapping review and import immediately
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [progress, setProgress] = useState(null);       // { done, total } while importing

  // Auto-build a default mapping once both the form's fields and a parsed file
  // are available. The user can refine it before clicking Import (or let it
  // auto-fire if `autoImport` is on).
  useEffect(() => {
    if (!parsed || !formDetail) return;
    // Detect columns whose values are arrays (Cognito repeater attachments)
    // so the mapper can route them to repeater fields rather than letting a
    // scalar field with a colliding label swallow the payload.
    const arrayColumns = new Set();
    for (const r of parsed.rows) {
      for (const [c, v] of Object.entries(r)) {
        if (Array.isArray(v)) arrayColumns.add(c);
      }
    }
    const m = autoMapColumns(parsed.columns, formDetail.fields, { arrayColumns });
    setMapping(m);

    // Auto-fire the import as soon as we have a mapping. If 0 columns mapped
    // the runImport call will surface a clear error message at the top of the
    // page instead of silently doing nothing.
    if (autoImport && !autoTriggered && !importing) {
      setAutoTriggered(true);
      setTimeout(() => runImport(m), 0);
    }
  }, [parsed, formDetail]);

  const fieldOptions = useMemo(
    () => (formDetail?.fields || []).map((f) => ({ key: f.fieldKey, label: f.label, type: f.type })),
    [formDetail],
  );

  const mappedCount = useMemo(
    () => Object.values(mapping).filter(Boolean).length,
    [mapping],
  );

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset auto-trigger so a fresh upload always re-fires the auto-import.
    // Without this, uploading a second file after a prior import (or a prior
    // error) leaves autoTriggered=true and only the manual button works.
    setError(''); setSuccess(''); setParsed(null); setMapping({}); setAutoTriggered(false);
    try {
      const lower = file.name.toLowerCase();
      let result;
      if (lower.endsWith('.json')) {
        const text = await file.text();
        result = parseJsonSubmissions(text, { fileName: file.name });
      } else {
        // Default to Excel parser for .xlsx / .xls / .csv
        const buffer = await file.arrayBuffer();
        result = parseExcelSubmissions(buffer, { fileName: file.name });
      }
      setFileName(file.name);
      setParsed(result);
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = '';
    }
  };

  const onMapChange = (col, fieldKey) => {
    setMapping((m) => ({ ...m, [col]: fieldKey || null }));
  };

  const clearAll = () => {
    setFileName(''); setParsed(null); setMapping({});
    setError(''); setSuccess(''); setAutoTriggered(false);
  };

  // Accept an explicit mapping arg so the auto-fire path can pass the freshly
  // computed mapping without waiting for the setState commit. Defend against
  // being called from an onClick handler — React passes the SyntheticEvent in
  // as the first arg, which would otherwise be treated as the mapping and
  // produce gibberish "mapped columns" like _reactName / nativeEvent.
  const looksLikeMapping = (m) =>
    m && typeof m === 'object'
    && !('nativeEvent' in m) && !('_reactName' in m) && !('currentTarget' in m);
  const runImport = async (mapOverride) => {
    const mapToUse = looksLikeMapping(mapOverride) ? mapOverride : mapping;
    if (!formId || !parsed) return;
    const localMappedCount = Object.values(mapToUse).filter(Boolean).length;
    if (localMappedCount === 0) {
      setError('No columns could be auto-mapped to fields. Turn off Auto-import and map manually.');
      return;
    }
    setImporting(true); setError(''); setSuccess('');
    try {
      let rows = remapRows(parsed.rows, mapToUse).filter((r) => Object.keys(r).length > 0);

      // Pull sub-field values out of Cognito's repeater sheets (Owner / Dog /
      // Emergency Contact / etc.) and use them to populate matching scalar
      // fields on the new form. Also replicates each populated value to every
      // field that shares the same label — so "First" / "Last" / "Signature"
      // get filled in on every section, not just the first.
      const formFields = formDetail?.fields || [];
      rows = rows.map((r) => {
        const extra = extractAndReplicate(r, formFields);
        return { ...extra, ...r }; // existing values win over extracted
      });

      // T&C / consent fields: original submitter already accepted these on
      // the source platform, so auto-tick them on every imported row.
      const consentKeys = findConsentFieldKeys(formFields);
      if (consentKeys.length) {
        rows = rows.map((r) => {
          const next = { ...r };
          for (const k of consentKeys) if (next[k] == null) next[k] = 'Yes';
          return next;
        });
      }

      if (rows.length === 0) {
        // Surface useful diagnostics. Every row coming out empty almost
        // always means the auto-mapper bound to columns that have no data
        // on the file's main sheet — different export structure, summary
        // sheet that became 'main', or unfamiliar column names.
        const mappedEntries = Object.entries(mapToUse).filter(([, v]) => v);
        const firstRow = parsed.rows[0] || {};
        const allKeys = new Set();
        for (const r of parsed.rows.slice(0, 5)) for (const k of Object.keys(r)) allKeys.add(k);
        const samples = mappedEntries.slice(0, 8).map(([col, fk]) => {
          const v = firstRow[col];
          const summary = v == null || v === '' ? '(empty)'
            : Array.isArray(v) ? `(array, ${v.length} item${v.length === 1 ? '' : 's'})`
            : typeof v === 'object' ? '(object)'
            : `"${String(v).replace(/\s+/g, ' ').slice(0, 40)}"`;
          return `  • ${col} → ${fk}: ${summary}`;
        }).join('\n');
        const extraNote = mappedEntries.length > 8 ? `\n  …and ${mappedEntries.length - 8} more mapped column${mappedEntries.length - 8 === 1 ? '' : 's'}.` : '';
        const firstRowKeys = Object.keys(firstRow);
        const firstRowSample = firstRowKeys.length
          ? `\n\nFirst row has data in these columns: ${firstRowKeys.slice(0, 10).join(', ')}${firstRowKeys.length > 10 ? `, …(+${firstRowKeys.length - 10})` : ''}.`
          : '\n\nFirst row is completely empty.';
        setError(
          `No rows to import after mapping. ${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'} parsed, ` +
          `${mappedEntries.length} column${mappedEntries.length === 1 ? '' : 's'} mapped, but the mapped columns had no values on any row.\n\n` +
          `First-row samples of mapped columns:\n${samples}${extraNote}${firstRowSample}\n\n` +
          `Loaded source: ${parsed.sourceLabel}\n\n` +
          `Likely fixes: (1) turn off Auto-import and review the mapping table below, ` +
          `or (2) check that the workbook's first sheet is the one with the actual entries — Cognito sometimes prepends a summary sheet.`
        );
        setImporting(false);
        return;
      }
      // Chunk client-side. The bulk endpoint is happy with up to ~50 rows
      // per call (latency to Afrihost is ~250ms, Vercel's function cap is
      // 60s, and our rows include repeater JSON that can be a few KB each).
      // 25 rows keeps each POST under ~1mb (Vercel's serverless body limit
      // is 4.5mb) and well within the timeout.
      const CHUNK_SIZE = 25;
      let totalCreated = 0;
      let totalAnswers = 0;
      let totalSkipped = 0;
      const failures = [];
      const rowErrorSamples = [];
      setProgress({ done: 0, total: rows.length });
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const slice = rows.slice(i, i + CHUNK_SIZE);
        try {
          const result = await apiFetch(`/admin/forms/${formId}/submissions/bulk`, {
            method: 'POST',
            body: { rows: slice },
          });
          totalCreated += result.created || 0;
          totalAnswers += result.answersCreated || 0;
          totalSkipped += result.skipped || 0;
          if (result.rowErrors?.length && rowErrorSamples.length < 5) {
            for (const m of result.rowErrors) {
              if (rowErrorSamples.length >= 5) break;
              if (!rowErrorSamples.includes(m)) rowErrorSamples.push(m);
            }
          }
        } catch (chunkErr) {
          failures.push({ from: i + 1, to: i + slice.length, message: chunkErr.message });
        }
        setProgress({ done: Math.min(i + CHUNK_SIZE, rows.length), total: rows.length });
      }
      const consentNote = consentKeys.length
        ? ` ${consentKeys.length} consent field${consentKeys.length === 1 ? '' : 's'} auto-checked.`
        : '';
      const failNote = failures.length
        ? ` ${failures.length} chunk${failures.length === 1 ? '' : 's'} failed: ` +
          failures.map((f) => `rows ${f.from}–${f.to} (${f.message})`).join('; ')
        : '';
      const rowErrNote = rowErrorSamples.length
        ? `\n\nSample row errors:\n${rowErrorSamples.map((m) => '  • ' + m).join('\n')}`
        : '';
      const msg =
        `Imported ${totalCreated} submission${totalCreated === 1 ? '' : 's'} into "${formDetail.title}" ` +
        `(${localMappedCount}/${parsed.columns.length} columns auto-mapped, ${totalAnswers} answers stored, ${totalSkipped} rows skipped).${consentNote}${failNote}${rowErrNote}`;
      if (failures.length && totalCreated === 0) setError(msg); else setSuccess(msg);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  return (
    <>
      <SEO title="Admin · Import submissions" />
      <PageHeader
        title="Import submissions"
        subtitle="Bring legacy form responses across — pick a target form, upload Excel or JSON, then map the columns."
      />
      <p className="-mt-4 mb-6 text-[10px] font-mono text-cocoa/60">
        Import engine: {IMPORT_LIB_VERSION}
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral whitespace-pre-wrap">
          {error}
        </div>
      )}
      {progress && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-cocoa">
          <div className="flex items-center justify-between">
            <span>
              Importing {progress.done.toLocaleString()} / {progress.total.toLocaleString()} row{progress.total === 1 ? '' : 's'}…
            </span>
            <span className="font-mono text-xs">
              {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-beige/50">
            <div
              className="h-full bg-gold transition-all duration-200"
              style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-cocoa whitespace-pre-wrap">
          {success}
        </div>
      )}

      <Card title="1. Choose target form">
        {loadingForms ? (
          <p className="text-sm text-cocoa">Loading forms…</p>
        ) : forms.length === 0 ? (
          <p className="text-sm text-cocoa">
            You don't have any forms yet. Create one on the <a href="/admin/forms" className="font-semibold text-coral hover:underline">Forms</a> page before importing submissions.
          </p>
        ) : (
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
              Form
            </span>
            <select
              value={formId}
              onChange={(e) => { setFormId(e.target.value); setParsed(null); setMapping({}); setError(''); setSuccess(''); setAutoTriggered(false); }}
              className={`${inputCls} mt-1`}
            >
              <option value="">— select a form —</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title} · {f._count?.fields ?? 0} field{(f._count?.fields ?? 0) === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            {formDetail && (
              <p className="mt-2 text-xs text-cocoa">
                {formDetail.fields.length} field{formDetail.fields.length === 1 ? '' : 's'} on this form.
                Imported rows will be mapped to these field keys.
              </p>
            )}
          </label>
        )}
      </Card>

      <div className="mt-6">
        <Card title="2. Upload data file">
          <p className="text-sm text-cocoa">
            Excel (<span className="font-mono">.xlsx</span>) with a header row, or JSON
            (array of entries, or <span className="font-mono">{`{ entries: [...] }`}</span>).
            Cognito Forms "Entries → Export" works for both formats as-is.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-beige bg-cream/40 p-4 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={autoImport}
              onChange={(e) => { setAutoImport(e.target.checked); setAutoTriggered(false); }}
              className="mt-0.5 h-4 w-4 accent-coral"
            />
            <span>
              <span className="font-semibold">Auto-import after upload</span>
              <span className="mt-1 block text-xs text-cocoa">
                Skip the column-mapping review and import immediately using auto-matched fields.
                Turn off if you want to verify the mapping first.
              </span>
            </span>
          </label>

          <div className="mt-4">
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-coral hover:text-coral ${!formId || importing ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
              {importing ? 'Importing…' : (fileName ? 'Choose another file' : 'Choose .xlsx or .json file')}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={onFile}
                className="hidden"
                disabled={!formId || importing}
              />
            </label>
            {!formId && (
              <p className="mt-2 text-xs text-cocoa">Pick a target form above first.</p>
            )}
            {parsed && (
              <p className="mt-3 text-xs text-cocoa">Loaded: <span className="font-mono">{parsed.sourceLabel}</span></p>
            )}
            {parsed?.ignoredMetaColumns?.length > 0 && (
              <p className="mt-1 text-xs text-cocoa">
                Skipped meta columns: <span className="font-mono">{parsed.ignoredMetaColumns.join(', ')}</span>
              </p>
            )}
          </div>
        </Card>
      </div>

      {parsed && formDetail && mappedCount === 0 && (
        <div className="mt-6">
          <Card title="⚠️ Diagnostic — no columns auto-mapped">
            <p className="text-sm text-cocoa">
              Below are the column names found in your file and the form's field labels.
              Paste this whole block back if you'd like me to write a manual mapping.
            </p>
            <textarea
              readOnly
              className="mt-3 w-full rounded-xl border border-beige bg-white/70 px-3 py-2 font-mono text-[11px] text-charcoal"
              rows={12}
              value={JSON.stringify({
                fileColumns: parsed.columns,
                ignoredMeta: parsed.ignoredMetaColumns,
                formFieldLabels: formDetail.fields
                  .filter((f) => !['section', 'subheading', 'paragraph'].includes(f.type))
                  .map((f) => `${f.fieldKey} (${f.label})`),
              }, null, 2)}
              onFocus={(e) => e.target.select()}
            />
          </Card>
        </div>
      )}

      {parsed && formDetail && (
        <div className="mt-6">
          <Card
            title={`3. Map columns → form fields  (${mappedCount}/${parsed.columns.length} mapped)`}
          >
            <p className="text-sm text-cocoa">
              We auto-matched columns to fields by label. Override anything that looks wrong.
              Columns set to "— ignore —" won't be imported.
            </p>

            <ul className="mt-4 max-h-[28rem] divide-y divide-beige/40 overflow-y-auto rounded-2xl border border-beige/60 bg-cream/30">
              {parsed.columns.map((col) => (
                <li key={col} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="text-sm">
                    <span className="font-medium text-charcoal">{col}</span>
                    <span className="ml-2 text-[11px] text-cocoa">
                      {sampleFor(parsed.rows, col)}
                    </span>
                  </div>
                  <span className="hidden text-cocoa sm:inline">→</span>
                  <select
                    value={mapping[col] || ''}
                    onChange={(e) => onMapChange(col, e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— ignore —</option>
                    {fieldOptions.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}  ({f.type})
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {parsed && (
        <div className="mt-6">
          <Card title={`4. Import  (${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'} ready)`}>
            <p className="text-sm text-cocoa">
              Each row becomes one submission against
              {' '}<span className="font-semibold text-charcoal">{formDetail?.title || 'the chosen form'}</span>.
              Rows where every mapped value is empty are skipped server-side.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-beige/40 pt-4">
              <button
                type="button"
                onClick={clearAll}
                disabled={importing}
                className="text-sm text-cocoa hover:text-coral disabled:opacity-50"
              >
                Clear
              </button>
              <Button
                type="button"
                onClick={() => runImport()}
                disabled={importing || !formId || !parsed || mappedCount === 0}
              >
                {importing ? 'Importing…' : `Import ${parsed.rows.length} submission${parsed.rows.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

// Show the first non-empty value of a column as a tiny preview hint.
// Arrays (repeater data) and objects get a short shape description instead of
// raw "[object Object]".
function sampleFor(rows, col) {
  for (const r of rows) {
    const v = r[col];
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      return `(${v.length} ${v.length === 1 ? 'entry' : 'entries'} — repeater data)`;
    }
    if (typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length === 0) continue;
      return `(nested: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''})`;
    }
    const s = String(v).trim();
    if (s === '') continue;
    const flat = s.replace(/\s+/g, ' ');
    return `e.g. "${flat.length > 40 ? flat.slice(0, 37) + '…' : flat}"`;
  }
  return '(no data)';
}
