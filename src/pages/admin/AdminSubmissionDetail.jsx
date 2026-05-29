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
              {submission.form.fields.map((f) => (
                <div key={f.id}>
                  <dt className="text-xs uppercase tracking-widest text-cocoa">{f.label}</dt>
                  <dd className="mt-1 text-sm text-charcoal break-words whitespace-pre-wrap">
                    {answerMap.get(f.id) || <span className="text-cocoa">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {submission.fileUploads?.length > 0 && (
            <Card title="Files">
              <ul className="space-y-2">
                {submission.fileUploads.map((file) => (
                  <li key={file.id} className="flex items-center justify-between rounded-xl bg-cream/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{file.originalName}</p>
                      <p className="text-xs text-cocoa">{(file.sizeBytes / 1024).toFixed(1)} KB · {file.mimeType}</p>
                    </div>
                    <a
                      href={`/api/uploads/${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-coral hover:underline"
                    >
                      Open
                    </a>
                  </li>
                ))}
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

          {submission.user && (
            <Card title="User">
              <p className="text-sm font-medium text-charcoal">{submission.user.name || '—'}</p>
              <p className="text-sm text-cocoa">{submission.user.email}</p>
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
