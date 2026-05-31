import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import Card from '../../components/admin/Card';
import { apiFetch, getToken } from '../../lib/api';

export default function AdminHome() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [clearing, setClearing] = useState(false);

  const load = () =>
    apiFetch('/admin/stats').then(setData).catch((e) => setErr(e.message));

  useEffect(() => { load(); }, []);

  const handleClear = async () => {
    if (!window.confirm('Mark all submitted forms as reviewed?')) return;
    setClearing(true);
    try {
      await apiFetch('/admin/submissions/mark-all-reviewed', { method: 'POST' });
      await load(); // refresh counts + recent list
    } catch (e) {
      alert(e.message);
    } finally {
      setClearing(false);
    }
  };

  // Submissions sorted: submitted first (status desc), then createdAt desc.
  // Show up to 5; split so submitted rows get a coral badge, reviewed get gold.
  const recent = data?.recentSubmissions?.slice(0, 5) ?? [];
  const submittedCount = recent.filter((s) => s.status === 'submitted').length;

  return (
    <>
      <SEO title="Admin · Dashboard" />
      <PageHeader title="Dashboard" subtitle="An overview of forms, submissions and users." />

      {err && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{err}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Forms"        value={data?.counts.forms ?? '–'} />
        <StatCard label="Submissions"  value={data?.counts.submissions ?? '–'} accent="gold"
                  hint={data ? `${data.counts.submissionsLast7d} in last 7 days` : null} />
        <StatCard label="Users"        value={data?.counts.users ?? '–'} accent="charcoal" />
        <StatCard label="Admins"       value={data?.counts.admins ?? '–'} accent="charcoal" />
      </div>

      <div className="mt-8">
        <Card
          title="Recent submissions"
          action={
            <div className="flex items-center gap-3">
              {submittedCount > 0 && (
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="rounded-full border border-charcoal/25 bg-white/70 px-3 py-1 text-xs font-semibold text-charcoal transition-colors hover:border-coral hover:text-coral disabled:opacity-50"
                >
                  {clearing ? 'Clearing…' : `Clear ${submittedCount} submitted`}
                </button>
              )}
              <Link to="/admin/submissions" className="text-sm font-semibold text-coral hover:underline">
                View all →
              </Link>
            </div>
          }
        >
          {recent.length ? (
            <ul className="divide-y divide-beige/40">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to={`/admin/submissions/${s.id}`} className="font-medium text-charcoal hover:text-coral">
                      {s.form.title}
                    </Link>
                    <p className="text-xs text-cocoa">#{s.id} · {new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                    s.status === 'submitted' ? 'bg-coral/15 text-coral' :
                    s.status === 'archived'  ? 'bg-beige/40 text-cocoa' :
                    'bg-gold/15 text-gold'
                  }`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-cocoa">No submissions yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
