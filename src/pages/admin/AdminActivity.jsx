import { useEffect, useState } from 'react';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/Button';
import { apiFetch } from '../../lib/api';

const ACTION_LABELS = {
  'auth.login':           { label: 'Signed in',          tone: 'gold' },
  'auth.register':        { label: 'Registered',         tone: 'gold' },
  'auth.logout':          { label: 'Signed out',         tone: 'cocoa' },
  'form.create':          { label: 'Created form',       tone: 'coral' },
  'form.update':          { label: 'Updated form',       tone: 'coral' },
  'form.delete':          { label: 'Deleted form',       tone: 'coral' },
  'form.fields.update':   { label: 'Edited fields',      tone: 'coral' },
  'submission.create':    { label: 'New submission',     tone: 'gold' },
  'submission.update':    { label: 'Updated submission', tone: 'cocoa' },
  'submission.delete':    { label: 'Deleted submission', tone: 'cocoa' },
  'submission.export.csv':{ label: 'CSV exported',       tone: 'cocoa' },
  'submission.export.pdf':{ label: 'PDF exported',       tone: 'cocoa' },
  'settings.update':      { label: 'Updated settings',   tone: 'cocoa' },
  'user.update':          { label: 'Updated user',       tone: 'cocoa' },
  'user.promote':         { label: 'Promoted to admin',  tone: 'coral' },
  'user.ban':             { label: 'Banned account',     tone: 'coral' },
  'user.unban':           { label: 'Unbanned account',   tone: 'gold' },
  'user.profile.update':  { label: 'Updated profile',    tone: 'cocoa' },
  'dog.create':           { label: 'Added a dog',        tone: 'gold' },
  'dog.update':           { label: 'Updated dog',        tone: 'cocoa' },
  'dog.remove':           { label: 'Removed a dog',      tone: 'cocoa' },
  'dog.create.admin':     { label: 'Admin added dog',    tone: 'coral' },
  'dog.update.admin':     { label: 'Admin updated dog',  tone: 'coral' },
  'dog.remove.admin':     { label: 'Admin removed dog',  tone: 'coral' },
  'submission.export.pdf.bundle': { label: 'PDF bundle exported', tone: 'cocoa' },
  'auth.forgotPassword':  { label: 'Requested password reset', tone: 'cocoa' },
  'auth.resetPassword':   { label: 'Reset password',     tone: 'gold' },
  'activity.clear':       { label: 'Cleared activity',   tone: 'coral' },
};

const TONES = {
  gold:  'bg-gold/15 text-gold',
  coral: 'bg-coral/15 text-coral',
  cocoa: 'bg-beige/40 text-cocoa',
};

export default function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch('/admin/activity?limit=100').then((d) => setLogs(d.logs)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    if (!window.confirm('Clear ALL activity log entries? This cannot be undone.')) return;
    setClearing(true); setError('');
    try {
      await apiFetch('/admin/activity', { method: 'DELETE' });
      load();
    } catch (err) { setError(err.message); }
    finally { setClearing(false); }
  };

  return (
    <>
      <SEO title="Admin · Activity" />
      <PageHeader
        title="Activity"
        subtitle="Audit trail of recent platform actions."
        actions={
          <button
            type="button"
            onClick={clearAll}
            disabled={clearing || logs.length === 0}
            className="rounded-full border border-coral/40 px-4 py-2 text-sm font-semibold text-coral transition-colors hover:bg-coral hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        }
      />

      {error && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}

      <Card>
        {loading ? (
          <p className="text-sm text-cocoa">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-cocoa">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-beige/40">
            {logs.map((log) => {
              const meta = ACTION_LABELS[log.action] || { label: log.action, tone: 'cocoa' };
              const who = log.admin?.email || log.user?.email || 'anonymous';
              return (
                <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${TONES[meta.tone]}`}>
                      {meta.label}
                    </span>
                    <span className="text-charcoal">{who}</span>
                    {log.entityType && (
                      <span className="text-xs text-cocoa">
                        {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-cocoa">{new Date(log.createdAt).toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
