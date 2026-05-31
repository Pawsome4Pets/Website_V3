import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch, getToken } from '../../lib/api';

export default function AdminSubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    apiFetch(`/admin/submissions/${id}`)
      .then((d) => setSubmission(d.submission))
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, [id]);

  const setStatus = async (status) => {
    try {
      await apiFetch(`/admin/submissions/${id}`, { method: 'PATCH', body: { status } });
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this submission?')) return;
    try {
      await apiFetch(`/admin/submissions/${id}`, { method: 'DELETE' });
      navigate('/admin/submissions');
    } catch (err) { setError(err.message); }
  };

  const downloadPdf = () => {
    fetch(`/api/exports/submissions/${id}.pdf`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.ok ? r.blob() : r.json().then((j) => { throw new Error(j.error || 'Export failed'); }))
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `submission-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => setError(e.message));
  };

  if (error) return <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>;
  if (!submission) return <p className="text-sm text-cocoa">Loading…</p>;

  const answerMap = new Map(submission.answers.map((a) => [a.fieldId, a.value]));

  return (
    <>
      <SEO title={`Admin · Submission #${submission.id}`} />
      <PageHeader
        title={`Submission #${submission.id}`}
        subtitle={<>{submission.form.title} · {new Date(submission.createdAt).toLocaleString()}</>}
        actions={
          <>
            <Link to="/admin/submissions" className="text-sm text-cocoa hover:text-coral">← Back</Link>
            <button onClick={downloadPdf}
                    className="rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-cream hover:bg-charcoal/85">
              Download PDF
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Answers">
            <dl className="grid gap-5 sm:grid-cols-2">
              {submission.form.fields.map((f) => {
                // Section / subheading / paragraph fields don't store user
                // input — render their label + helpText (terms text, clauses,
                // intro copy etc.) as readable content spanning both columns.
                if (f.type === 'section') {
                  return (
                    <div key={f.id} className="sm:col-span-2 mt-4 border-t border-beige/40 pt-4">
                      {f.label && (
                        <h3 className="text-base font-semibold text-charcoal">{f.label}</h3>
                      )}
                      {f.helpText && (
                        <p className="mt-1 text-xs text-cocoa whitespace-pre-wrap">{f.helpText}</p>
                      )}
                    </div>
                  );
                }
                if (f.type === 'subheading') {
                  return (
                    <div key={f.id} className="sm:col-span-2 mt-3">
                      {f.label && (
                        <h4 className="text-sm font-semibold text-charcoal">{f.label}</h4>
                      )}
                      {f.helpText && (
                        <p className="mt-1 text-xs text-cocoa whitespace-pre-wrap">{f.helpText}</p>
                      )}
                    </div>
                  );
                }
                if (f.type === 'paragraph') {
                  return (
                    <div key={f.id} className="sm:col-span-2">
                      {f.label && (
                        <p className="text-[10px] font-mono uppercase tracking-widest text-cocoa/70">
                          {f.label}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-cocoa whitespace-pre-wrap">
                        {f.helpText || <span className="text-cocoa/60">—</span>}
                      </p>
                    </div>
                  );
                }
                if (f.type === 'repeater') {
                  return <RepeaterAnswer key={f.id} field={f} value={answerMap.get(f.id)} />;
                }
                const raw = answerMap.get(f.id);
                const fileMeta = parseFileAnswer(raw);
                if (fileMeta) {
                  return <FileAnswer key={f.id} field={f} file={fileMeta} />;
                }
                return (
                  <div key={f.id}>
                    <dt className="text-xs uppercase tracking-widest text-cocoa">{f.label}</dt>
                    <dd className="mt-1 text-sm text-charcoal break-words whitespace-pre-wrap">
                      {raw || <span className="text-cocoa">—</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>

          {submission.fileUploads?.length > 0 && (
            <Card title="Files">
              <ul className="space-y-3">
                {submission.fileUploads.map((file) => {
                  const isImage = (file.mimeType || '').startsWith('image/');
                  const href = `/api/uploads/${file.id}`;
                  return (
                    <li key={file.id} className="flex items-center gap-3 rounded-xl bg-cream/60 px-3 py-2">
                      {isImage ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img
                            src={href}
                            alt={file.originalName}
                            loading="lazy"
                            className="h-16 w-16 rounded-lg object-cover ring-1 ring-beige/60 hover:ring-coral"
                          />
                        </a>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-beige/40 text-[10px] font-semibold uppercase tracking-widest text-cocoa">
                          {(file.mimeType || '').split('/')[1]?.slice(0, 4) || 'FILE'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-charcoal">{file.originalName}</p>
                        <p className="text-xs text-cocoa">{(file.sizeBytes / 1024).toFixed(1)} KB · {file.mimeType}</p>
                      </div>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-sm font-semibold text-coral hover:underline"
                      >
                        Open
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Status">
            <p className="mb-3 text-xs uppercase tracking-widest text-cocoa">Current</p>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              submission.status === 'reviewed' ? 'bg-gold/20 text-gold' :
              submission.status === 'archived' ? 'bg-beige/40 text-cocoa' :
              'bg-coral/15 text-coral'
            }`}>{submission.status}</span>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['submitted', 'reviewed', 'archived'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={s === submission.status}
                  className="rounded-lg border border-beige bg-white/60 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          {(submission.user || submission.submittedEmail) && (
            <Card title="User">
              <p className="text-sm font-medium text-charcoal">{submission.user?.name || '—'}</p>
              <p className="text-sm text-cocoa">{submission.user?.email || submission.submittedEmail}</p>
              {!submission.user && submission.submittedEmail && (
                <p className="mt-1 text-[10px] uppercase tracking-widest text-cocoa/70">From form (no linked account)</p>
              )}
            </Card>
          )}

          <Card title="Meta">
            <ul className="space-y-1.5 text-xs text-cocoa">
              <li><span className="font-semibold text-charcoal">IP:</span> {submission.ipAddress || '—'}</li>
              <li><span className="font-semibold text-charcoal">UA:</span> {(submission.userAgent || '').slice(0, 60)}{(submission.userAgent || '').length > 60 ? '…' : ''}</li>
              <li><span className="font-semibold text-charcoal">Updated:</span> {new Date(submission.updatedAt).toLocaleString()}</li>
            </ul>
            <button onClick={remove}
                    className="mt-4 w-full rounded-full border border-coral/40 px-3 py-2 text-xs font-semibold text-coral hover:bg-coral hover:text-cream">
              Delete submission
            </button>
          </Card>
        </aside>
      </div>
    </>
  );
}

// Parse a SubmissionAnswer.value that came from a file upload field. The
// public submit endpoint stores file references as JSON ({id, originalName,
// mimeType, sizeBytes}) — sometimes as an array of those for multi-file
// fields. Returns an array of file metas, or null if the value isn't a
// file reference.
function parseFileAnswer(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  let parsed;
  try { parsed = JSON.parse(trimmed); } catch { return null; }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const files = list.filter((f) => f && typeof f === 'object' && Number.isInteger(f.id) && typeof f.originalName === 'string');
  return files.length ? files : null;
}

function FileAnswer({ field, file: files }) {
  return (
    <div className="sm:col-span-2">
      <dt className="text-xs uppercase tracking-widest text-cocoa">{field.label}</dt>
      <dd className="mt-2 flex flex-wrap gap-3">
        {files.map((f) => {
          const isImage = (f.mimeType || '').startsWith('image/');
          const href = `/api/uploads/${f.id}`;
          return (
            <a
              key={f.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-cream/60 px-3 py-2 ring-1 ring-beige/40 transition-colors hover:ring-coral"
            >
              {isImage ? (
                <img
                  src={href}
                  alt={f.originalName}
                  loading="lazy"
                  className="h-16 w-16 rounded-lg object-cover ring-1 ring-beige/60"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-beige/40 text-[10px] font-semibold uppercase tracking-widest text-cocoa">
                  {(f.mimeType || '').split('/')[1]?.slice(0, 4) || 'FILE'}
                </div>
              )}
              <div className="min-w-0 max-w-[200px]">
                <p className="truncate text-sm font-medium text-charcoal">{f.originalName}</p>
                <p className="text-xs text-cocoa">{(f.sizeBytes / 1024).toFixed(1)} KB</p>
              </div>
            </a>
          );
        })}
      </dd>
    </div>
  );
}

// Render a repeater answer as a card per record with key:value rows. The
// stored value is a JSON string (array of sub-records). We try to label each
// sub-key against the repeater's defined sub-fields; for imported data
// (Cognito) the keys won't match so we fall back to humanising the raw key
// (OwnerName_First → "Owner Name First"). Cognito's auto-generated FK
// (suffix _Id) is hidden as noise.
function RepeaterAnswer({ field, value }) {
  if (!value) {
    return (
      <div>
        <dt className="text-xs uppercase tracking-widest text-cocoa">{field.label}</dt>
        <dd className="mt-1 text-sm text-cocoa">—</dd>
      </div>
    );
  }
  let records = null;
  try { records = JSON.parse(value); } catch { /* fall through */ }
  if (!Array.isArray(records) || records.length === 0) {
    return (
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-widest text-cocoa">{field.label}</dt>
        <dd className="mt-1 text-sm text-charcoal break-words whitespace-pre-wrap">{String(value)}</dd>
      </div>
    );
  }

  const subLabel = new Map();
  for (const sf of (field.options?.fields || [])) {
    if (sf?.fieldKey && sf?.label) subLabel.set(sf.fieldKey, sf.label);
  }
  const humanize = (k) => String(k)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="sm:col-span-2">
      <dt className="text-xs uppercase tracking-widest text-cocoa">{field.label}</dt>
      <dd className="mt-2 space-y-3">
        {records.map((rec, i) => (
          <div key={i} className="rounded-xl border border-beige/60 bg-cream/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cocoa">
              {field.label}{records.length > 1 ? ` #${i + 1}` : ''}
            </p>
            <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {Object.entries(rec || {}).map(([k, v]) => {
                if (v == null || v === '') return null;
                if (/_id$/i.test(k)) return null;
                const label = subLabel.get(k) || humanize(k);
                const display = typeof v === 'object' ? JSON.stringify(v) : String(v);
                return (
                  <div key={k}>
                    <dt className="text-[10px] uppercase tracking-widest text-cocoa/80">{label}</dt>
                    <dd className="text-xs text-charcoal break-words">{display}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </dd>
    </div>
  );
}
