import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import { apiFetch } from '../../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    apiFetch('/admin/users?limit=200')
      .then((d) => setUsers(d.users))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggleActive = async (u) => {
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } });
      load();
    } catch (err) { setError(err.message); }
  };

  const promote = async (u) => {
    if (!window.confirm(
      `Make ${u.name || u.email} an admin? They will be able to sign in to the admin console using their existing password.`
    )) return;
    try {
      const res = await apiFetch(`/admin/users/${u.id}/promote`, { method: 'POST' });
      if (res.alreadyAdmin) {
        setError(`${u.email} was already an admin.`);
      } else {
        setError('');
      }
      load();
    } catch (err) { setError(err.message); }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
  });

  return (
    <>
      <SEO title="Admin · Users" />
      <PageHeader title="Users" subtitle="Accounts created via registration or form auto-creation." />

      {error && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}

      <Card>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="mb-5 w-full rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        />
        {loading ? (
          <p className="text-sm text-cocoa">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-cocoa">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-cocoa">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige/40">
                {filtered.map((u) => (
                  <tr key={u.id} className="text-charcoal">
                    <td className="py-3 pr-4 font-medium">{u.name || <span className="text-cocoa">—</span>}</td>
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4 text-cocoa">{u.phone || '—'}</td>
                    <td className="py-3 pr-4 text-cocoa">{u.role?.name || '—'}</td>
                    <td className="py-3 pr-4 text-cocoa">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => toggleActive(u)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                          u.isActive ? 'bg-gold/20 text-gold hover:bg-gold/30' : 'bg-beige/40 text-cocoa hover:bg-beige/60'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link to={`/admin/users/${u.id}`} className="mr-3 text-sm text-coral hover:underline">View</Link>
                      {u.isAdmin ? (
                        <span className="inline-block rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-coral">
                          Admin
                        </span>
                      ) : (
                        <button
                          onClick={() => promote(u)}
                          className="text-sm font-semibold text-coral hover:underline"
                        >
                          Make admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
