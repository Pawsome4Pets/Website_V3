import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import Button from '../../components/Button';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch } from '../../lib/api';
import { parseCognitoForm } from '../../lib/cognitoImport';
import { parseCognitoExcel } from '../../lib/excelImport';

const inputCls =
  'w-full rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20';

const TAB = { JSON: 'json', EXCEL: 'excel' };

export default function AdminImport() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(TAB.EXCEL);

  // ── Shared state for the parsed-preview / import-action UI ────────────────
  const [parsed, setParsed] = useState(null);          // { title, description, fields, submissions? }
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState('');

  // ── JSON-specific ─────────────────────────────────────────────────────────
  const [jsonRaw, setJsonRaw] = useState('');

  // ── Excel-specific ────────────────────────────────────────────────────────
  const [excelFileName, setExcelFileName] = useState('');
  const [importSubmissions, setImportSubmissions] = useState(false);

  const switchTab = (next) => {
    setTab(next);
    setParsed(null);
    setTitle('');
    setError('');
    setSuccess('');
    setJsonRaw('');
    setExcelFileName('');
    setImportSubmissions(false);
  };

  // ── JSON parsing ──────────────────────────────────────────────────────────
  const parseJson = (raw) => {
    setError('');
    setParsed(null);
    setSuccess('');
    if (!raw || !raw.trim()) return;
    try {
      const result = parseCognitoForm(raw);
      setParsed(result);
      setTitle(result.title);
    } catch (err) {
      setError(err.message);
    }
  };

  const onJsonFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setJsonRaw(text);
      parseJson(text);
    } catch (err) {
      setError(`Could not read file: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  // ── Excel parsing ─────────────────────────────────────────────────────────
  const onExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    setParsed(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseCognitoExcel(buffer, { fileName: file.name });
      setParsed(result);
      setTitle(result.title);
      setExcelFileName(file.name);
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = '';
    }
  };

  // ── Run the import ────────────────────────────────────────────────────────
  const runImport = async () => {
    if (!parsed || !title.trim()) return;
    setImporting(true);
    setError('');
    setSuccess('');
    try {
      const { form } = await apiFetch('/admin/forms', {
        method: 'POST',
        body: {
          title: title.trim(),
          ...(parsed.description ? { description: parsed.description } : {}),
        },
      });

      if (parsed.fields.length) {
        const fieldsPayload = parsed.fields.map((f) => {
          const { _sourceType, ...clean } = f;
          return clean;
        });
        await apiFetch(`/admin/forms/${form.id}/fields`, {
          method: 'PUT',
          body: { fields: fieldsPayload },
        });
      }

      // Excel only: optionally seed historical submissions.
      if (tab === TAB.EXCEL && importSubmissions && Array.isArray(parsed.submissions) && parsed.submissions.length) {
        try {
          await apiFetch(`/admin/forms/${form.id}/submissions/bulk`, {
            method: 'POST',
            body: { rows: parsed.submissions },
          });
        } catch (subErr) {
          // Surface the partial outcome — form is created, but seeding failed.
          setError(`Form created, but historical submissions failed to import: ${subErr.message}`);
          setSuccess('');
          navigate(`/admin/forms/${form.id}`);
          return;
        }
      }

      navigate(`/admin/forms/${form.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <SEO title="Admin · Import" />
      <PageHeader
        title="Import legacy forms"
        subtitle="Bring old Cognito Forms across — paste the JSON backup or upload an Excel entries export."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-cocoa">
          {success}
        </div>
      )}

      <Card>
        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-full border border-beige bg-white/60 p-1">
          <button
            type="button"
            onClick={() => switchTab(TAB.EXCEL)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === TAB.EXCEL ? 'bg-coral text-cream' : 'text-cocoa hover:text-coral'
            }`}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => switchTab(TAB.JSON)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === TAB.JSON ? 'bg-coral text-cream' : 'text-cocoa hover:text-coral'
            }`}
          >
            JSON backup
          </button>
        </div>

        {tab === TAB.EXCEL ? (
          <ExcelPanel
            onFile={onExcelFile}
            fileName={excelFileName}
            importSubmissions={importSubmissions}
            setImportSubmissions={setImportSubmissions}
            submissionCount={parsed?.submissions?.length ?? 0}
          />
        ) : (
          <JsonPanel jsonRaw={jsonRaw} setJsonRaw={setJsonRaw} parseJson={parseJson} onFile={onJsonFile} />
        )}

        {parsed && (
          <Preview parsed={parsed} title={title} setTitle={setTitle} />
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-beige/40 pt-5">
          {parsed && (
            <button
              type="button"
              onClick={() => switchTab(tab)}
              disabled={importing}
              className="text-sm text-cocoa hover:text-coral disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <Button
            type="button"
            onClick={runImport}
            disabled={importing || !parsed || !title.trim() || parsed.fields.length === 0}
          >
            {importing ? 'Importing…' : 'Import & open editor'}
          </Button>
        </div>
      </Card>
    </>
  );
}

// ── Sub-components (kept in-file to match the existing AdminForms style) ─────

function ExcelPanel({ onFile, fileName, importSubmissions, setImportSubmissions, submissionCount }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-cocoa">
        Export your form from Cognito Forms as Excel (<span className="font-mono">Entries → Export → Excel</span>),
        then upload the <span className="font-mono">.xlsx</span> here. We'll read the column
        headers to recreate the form fields, and optionally bring across the rows as historical submissions.
      </p>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-coral hover:text-coral">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
          </svg>
          {fileName ? 'Choose another file' : 'Choose .xlsx file'}
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={onFile}
            className="hidden"
          />
        </label>
        {fileName && (
          <span className="text-xs text-cocoa">
            Loaded <span className="font-mono">{fileName}</span>
          </span>
        )}
      </div>

      {submissionCount > 0 && (
        <label className="flex items-start gap-3 rounded-xl border border-beige bg-cream/40 p-4 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={importSubmissions}
            onChange={(e) => setImportSubmissions(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-coral"
          />
          <span>
            <span className="font-semibold">Also import {submissionCount} historical submission{submissionCount === 1 ? '' : 's'}</span>
            <span className="mt-1 block text-xs text-cocoa">
              Each data row in the sheet becomes a submission against the new form. Existing field types are used to
              parse values; rows that fail validation will be skipped server-side.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

function JsonPanel({ jsonRaw, setJsonRaw, parseJson, onFile }) {
  const onPaste = (val) => {
    setJsonRaw(val);
    parseJson(val);
  };
  return (
    <div className="space-y-5">
      <p className="text-sm text-cocoa">
        Export the form from Cognito Forms (<span className="font-mono">Settings → Backup</span>),
        then upload the <span className="font-mono">.json</span> file or paste its contents below.
      </p>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-coral hover:text-coral">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
          </svg>
          Choose .json file
          <input
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            className="hidden"
          />
        </label>
        <span className="text-xs text-cocoa">
          …or paste the JSON below. Backup files from Cognito Forms work as-is.
        </span>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Cognito JSON</span>
        <textarea
          value={jsonRaw}
          onChange={(e) => onPaste(e.target.value)}
          rows={6}
          placeholder='{"Name":"...","Items":[ ... ]}'
          className={`${inputCls} mt-1 font-mono text-xs`}
        />
      </label>
    </div>
  );
}

function Preview({ parsed, title, setTitle }) {
  return (
    <div className="mt-6 rounded-2xl border border-beige/60 bg-cream/40 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="font-serif text-base text-charcoal">Preview</h4>
        <span className="text-xs text-cocoa">
          {parsed.fields.length} field{parsed.fields.length === 1 ? '' : 's'} detected
          {Array.isArray(parsed.submissions) && parsed.submissions.length > 0 && (
            <> · {parsed.submissions.length} submission row{parsed.submissions.length === 1 ? '' : 's'}</>
          )}
        </span>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
          Title (edit before importing)
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputCls} mt-1`}
        />
      </label>

      {parsed.description && (
        <p className="mt-3 text-xs text-cocoa">
          <span className="font-semibold uppercase tracking-widest">Description:</span>{' '}
          <span className="line-clamp-3">{parsed.description}</span>
        </p>
      )}

      {parsed.fields.length === 0 ? (
        <p className="mt-4 text-sm text-cocoa">
          No fields were detected. Double-check that the file is a Cognito Forms backup
          (for JSON) or an entries export with a header row (for Excel).
        </p>
      ) : (
        <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {parsed.fields.map((f, i) => (
            <li key={`${f.fieldKey}_${i}`} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 inline-block min-w-[70px] rounded-full bg-beige/40 px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-cocoa">
                {f.type}
              </span>
              <span className="flex-1">
                <span className="font-medium text-charcoal">{f.label}</span>
                {f.isRequired && <span className="ml-1 text-coral">*</span>}
                <span className="ml-2 font-mono text-[11px] text-cocoa">{f.fieldKey}</span>
                {Array.isArray(f.options) && f.options.length > 0 && (
                  <span className="mt-0.5 block text-[11px] text-cocoa">
                    Options: {f.options.slice(0, 8).join(', ')}{f.options.length > 8 ? '…' : ''}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
