import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/Button';
import { apiFetch } from '../../lib/api';

const inputCls = 'w-full rounded-xl border border-beige bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-coral focus:ring-2 focus:ring-coral/20';

function dogTraits(dog) {
  const parts = [];
  if (dog.sex === 'male') parts.push('Male');
  else if (dog.sex === 'female') parts.push('Female');
  if (dog.isSterilized === true) {
    parts.push(dog.sex === 'female' ? 'Spayed' : dog.sex === 'male' ? 'Neutered' : 'Spayed/Neutered');
  } else if (dog.isSterilized === false) {
    parts.push('Intact');
  }
  return parts.join(' · ');
}

function RadioGroup({ label, name, value, onChange, options, disabled }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-semibold uppercase tracking-widest text-cocoa">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                checked
                  ? 'border-coral bg-coral text-cream'
                  : 'border-beige bg-white/70 text-charcoal hover:border-coral hover:text-coral'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
const STERILIZED_OPTIONS = [
  { value: 'yes', label: 'Spayed / Neutered' },
  { value: 'no', label: 'Intact' },
];

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', surname: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);

  const [editingDogId, setEditingDogId] = useState(null);
  const [dogDraft, setDogDraft] = useState({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' });
  const [savingDog, setSavingDog] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  const [addingDog, setAddingDog] = useState(false);
  const [addDraft, setAddDraft] = useState({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' });

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 1800); };

  const load = () =>
    apiFetch(`/admin/users/${id}`)
      .then((d) => {
        setUser(d.user);
        setDraft({ name: d.user.name || '', surname: d.user.surname || '', phone: d.user.phone || '' });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await apiFetch(`/admin/users/${id}`, {
        method: 'PATCH',
        body: {
          name: draft.name.trim() || null,
          surname: draft.surname.trim() || null,
          phone: draft.phone.trim() || null,
        },
      });
      await load();
      setEditing(false);
      flash('Profile updated.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const ban = async () => {
    if (banReason.trim().length < 3) { setError('Provide a ban reason (3+ chars).'); return; }
    setBanning(true); setError('');
    try {
      await apiFetch(`/admin/users/${id}/ban`, { method: 'POST', body: { reason: banReason.trim() } });
      setBanReason('');
      await load();
      flash('Account banned.');
    } catch (err) { setError(err.message); }
    finally { setBanning(false); }
  };

  const unban = async () => {
    if (!window.confirm('Lift the ban on this account?')) return;
    setBanning(true); setError('');
    try {
      await apiFetch(`/admin/users/${id}/unban`, { method: 'POST' });
      await load();
      flash('Account unbanned.');
    } catch (err) { setError(err.message); }
    finally { setBanning(false); }
  };

  const startEditDog = (dog) => {
    setEditingDogId(dog.id);
    setDogDraft({
      name: dog.name || '',
      breed: dog.breed || '',
      birthDate: dog.birthDate ? new Date(dog.birthDate).toISOString().slice(0, 10) : '',
      sex: dog.sex || '',
      isSterilized: dog.isSterilized === true ? 'yes' : dog.isSterilized === false ? 'no' : '',
      notes: dog.notes || '',
    });
  };

  const saveDog = async (dogId) => {
    setSavingDog(true); setError('');
    try {
      await apiFetch(`/admin/dogs/${dogId}`, {
        method: 'PATCH',
        body: {
          name: dogDraft.name.trim(),
          breed: dogDraft.breed.trim() || null,
          birthDate: dogDraft.birthDate || null,
          sex: dogDraft.sex || null,
          isSterilized: dogDraft.isSterilized === '' ? null : dogDraft.isSterilized === 'yes',
          notes: dogDraft.notes.trim() || null,
        },
      });
      setEditingDogId(null);
      await load();
      flash('Saved.');
    } catch (err) { setError(err.message); }
    finally { setSavingDog(false); }
  };

  const confirmRemove = async () => {
    if (!removeTarget || removeReason.trim().length < 3) return;
    setRemoving(true); setError('');
    try {
      await apiFetch(`/admin/dogs/${removeTarget.id}`, {
        method: 'DELETE',
        body: { removalReason: removeReason.trim() },
      });
      setRemoveTarget(null); setRemoveReason('');
      await load();
      flash('Dog removed.');
    } catch (err) { setError(err.message); }
    finally { setRemoving(false); }
  };

  const submitAddDog = async (e) => {
    e.preventDefault();
    if (!addDraft.name.trim()) return;
    setSavingDog(true); setError('');
    try {
      await apiFetch(`/admin/users/${id}/dogs`, {
        method: 'POST',
        body: {
          name: addDraft.name.trim(),
          breed: addDraft.breed.trim() || null,
          birthDate: addDraft.birthDate || null,
          sex: addDraft.sex || null,
          isSterilized: addDraft.isSterilized === '' ? null : addDraft.isSterilized === 'yes',
          notes: addDraft.notes.trim() || null,
        },
      });
      setAddDraft({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' });
      setAddingDog(false);
      await load();
      flash('Dog added.');
    } catch (err) { setError(err.message); }
    finally { setSavingDog(false); }
  };

  if (!user && !loading) {
    return (
      <>
        <SEO title="Admin · User" />
        <PageHeader title="User not found" actions={<Link to="/admin/users" className="text-sm text-cocoa hover:text-coral">← Back to users</Link>} />
        {error && <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
      </>
    );
  }

  const activeDogs = (user?.dogs || []).filter((d) => d.isActive);
  const removedDogs = (user?.dogs || []).filter((d) => !d.isActive);

  return (
    <>
      <SEO title={`Admin · ${user?.email || 'User'}`} />
      <PageHeader
        title={user ? ([user.name, user.surname].filter(Boolean).join(' ') || user.email) : 'Loading…'}
        subtitle={user ? user.email : ''}
        actions={<Link to="/admin/users" className="text-sm text-cocoa hover:text-coral">← Back to users</Link>}
      />

      {error && <div className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
      {success && <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">{success}</div>}

      {loading ? (
        <p className="text-sm text-cocoa">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── Left column: profile + dogs ─────────────────────────────────── */}
          <div className="space-y-6">
            <Card
              title="Profile"
              action={
                !editing && (
                  <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-coral hover:underline">
                    Edit
                  </button>
                )
              }
            >
              {!editing ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
                  <dt className="text-cocoa">First name</dt><dd className="text-charcoal">{user.name || '—'}</dd>
                  <dt className="text-cocoa">Surname</dt><dd className="text-charcoal">{user.surname || '—'}</dd>
                  <dt className="text-cocoa">Email</dt><dd className="font-mono text-charcoal">{user.email}</dd>
                  <dt className="text-cocoa">Phone</dt><dd className="text-charcoal">{user.phone || '—'}</dd>
                  <dt className="text-cocoa">Role</dt><dd className="text-charcoal">{user.role?.name || '—'}</dd>
                  <dt className="text-cocoa">Joined</dt><dd className="text-charcoal">{new Date(user.createdAt).toLocaleDateString()}</dd>
                  <dt className="text-cocoa">Status</dt>
                  <dd>
                    {user.isBanned ? (
                      <span className="inline-block rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-coral">Banned</span>
                    ) : user.isActive ? (
                      <span className="inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-gold">Active</span>
                    ) : (
                      <span className="inline-block rounded-full bg-beige/40 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-cocoa">Disabled</span>
                    )}
                  </dd>
                  {user.isAdmin && (
                    <>
                      <dt className="text-cocoa">Admin access</dt>
                      <dd>
                        <span className="inline-block rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-coral">Admin</span>
                      </dd>
                    </>
                  )}
                </dl>
              ) : (
                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">First name</span>
                      <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={`${inputCls} mt-1`} autoFocus />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Surname</span>
                      <input value={draft.surname} onChange={(e) => setDraft((d) => ({ ...d, surname: e.target.value }))} className={`${inputCls} mt-1`} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Phone</span>
                    <input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} className={`${inputCls} mt-1`} />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setDraft({ name: user.name || '', surname: user.surname || '', phone: user.phone || '' }); }}
                      className="text-sm text-cocoa hover:text-coral"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </Card>

            <Card
              title={`Dogs (${activeDogs.length}/5 active)`}
              action={
                !addingDog && activeDogs.length < 5 && (
                  <button type="button" onClick={() => setAddingDog(true)} className="text-sm font-semibold text-coral hover:underline">
                    + Add a dog
                  </button>
                )
              }
            >
              {addingDog && (
                <form onSubmit={submitAddDog} className="mb-5 space-y-4 rounded-2xl border border-beige/60 bg-cream/40 p-5">
                  <h4 className="font-serif text-base text-charcoal">Add a dog</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Name *</span>
                      <input required value={addDraft.name} onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))} className={`${inputCls} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Breed</span>
                      <input value={addDraft.breed} onChange={(e) => setAddDraft((d) => ({ ...d, breed: e.target.value }))} className={`${inputCls} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Birth date</span>
                      <input type="date" value={addDraft.birthDate} onChange={(e) => setAddDraft((d) => ({ ...d, birthDate: e.target.value }))} className={`${inputCls} mt-1`} />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RadioGroup
                      label="Sex"
                      name="admin-add-sex"
                      value={addDraft.sex}
                      onChange={(v) => setAddDraft((d) => ({ ...d, sex: v }))}
                      options={SEX_OPTIONS}
                      disabled={savingDog}
                    />
                    <RadioGroup
                      label="Sterilization"
                      name="admin-add-sterilized"
                      value={addDraft.isSterilized}
                      onChange={(v) => setAddDraft((d) => ({ ...d, isSterilized: v }))}
                      options={STERILIZED_OPTIONS}
                      disabled={savingDog}
                    />
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Notes</span>
                    <textarea rows={2} value={addDraft.notes} onChange={(e) => setAddDraft((d) => ({ ...d, notes: e.target.value }))} className={`${inputCls} mt-1`} />
                  </label>
                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={savingDog || !addDraft.name.trim()}>
                      {savingDog ? 'Adding…' : 'Add dog'}
                    </Button>
                    <button type="button" onClick={() => setAddingDog(false)} className="text-sm text-cocoa hover:text-coral" disabled={savingDog}>Cancel</button>
                  </div>
                </form>
              )}

              {activeDogs.length === 0 ? (
                <p className="text-sm text-cocoa">This user has no active dogs.</p>
              ) : (
                <ul className="space-y-4">
                  {activeDogs.map((dog) => {
                    const isEditing = editingDogId === dog.id;
                    return (
                      <li key={dog.id} className="rounded-2xl border border-beige/60 bg-cream/30 p-5">
                        {!isEditing ? (
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="font-serif text-lg text-charcoal">{dog.name}</h4>
                              <p className="text-xs text-cocoa">
                                {dog.breed || 'Breed not set'}
                                {dog.birthDate && ` · ${new Date(dog.birthDate).toLocaleDateString()}`}
                              </p>
                              {dogTraits(dog) && (
                                <p className="mt-0.5 text-xs text-cocoa">{dogTraits(dog)}</p>
                              )}
                              {dog.notes && <p className="mt-2 text-sm text-charcoal">{dog.notes}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <button type="button" onClick={() => startEditDog(dog)} className="text-sm font-semibold text-coral hover:underline">Edit</button>
                              <button type="button" onClick={() => { setRemoveTarget(dog); setRemoveReason(''); }} className="text-sm text-cocoa hover:text-coral">Remove</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Name *</span>
                                <input value={dogDraft.name} onChange={(e) => setDogDraft((d) => ({ ...d, name: e.target.value }))} className={`${inputCls} mt-1`} />
                              </label>
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Breed</span>
                                <input value={dogDraft.breed} onChange={(e) => setDogDraft((d) => ({ ...d, breed: e.target.value }))} className={`${inputCls} mt-1`} />
                              </label>
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Birth date</span>
                                <input type="date" value={dogDraft.birthDate} onChange={(e) => setDogDraft((d) => ({ ...d, birthDate: e.target.value }))} className={`${inputCls} mt-1`} />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <RadioGroup
                                label="Sex"
                                name={`admin-edit-sex-${dog.id}`}
                                value={dogDraft.sex}
                                onChange={(v) => setDogDraft((d) => ({ ...d, sex: v }))}
                                options={SEX_OPTIONS}
                                disabled={savingDog}
                              />
                              <RadioGroup
                                label="Sterilization"
                                name={`admin-edit-sterilized-${dog.id}`}
                                value={dogDraft.isSterilized}
                                onChange={(v) => setDogDraft((d) => ({ ...d, isSterilized: v }))}
                                options={STERILIZED_OPTIONS}
                                disabled={savingDog}
                              />
                            </div>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Notes</span>
                              <textarea rows={2} value={dogDraft.notes} onChange={(e) => setDogDraft((d) => ({ ...d, notes: e.target.value }))} className={`${inputCls} mt-1`} />
                            </label>
                            <div className="flex items-center gap-3">
                              <Button type="button" onClick={() => saveDog(dog.id)} disabled={savingDog || !dogDraft.name.trim()}>
                                {savingDog ? 'Saving…' : 'Save'}
                              </Button>
                              <button type="button" onClick={() => setEditingDogId(null)} className="text-sm text-cocoa hover:text-coral" disabled={savingDog}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {removedDogs.length > 0 && (
              <Card title="Removed dogs (history)">
                <ul className="space-y-3 text-sm">
                  {removedDogs.map((d) => (
                    <li key={d.id} className="rounded-xl border border-beige/40 bg-cream/40 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-charcoal">{d.name}</span>
                        <span className="text-xs text-cocoa">Removed {d.removedAt ? new Date(d.removedAt).toLocaleDateString() : ''}</span>
                      </div>
                      {d.removalReason && <p className="mt-1 text-xs text-cocoa">Reason: {d.removalReason}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* ── Right column: ban panel ────────────────────────────────────── */}
          <aside className="space-y-6 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:self-start lg:pr-1">
            <Card title={user.isBanned ? 'Banned' : 'Ban this account'}>
              {user.isBanned ? (
                <div className="space-y-3">
                  <p className="text-sm text-cocoa">
                    This account is banned and cannot sign in.
                  </p>
                  {user.banReason && (
                    <p className="rounded-lg bg-cream/60 px-3 py-2 text-xs text-cocoa">
                      <span className="font-semibold uppercase tracking-widest">Reason</span><br />
                      {user.banReason}
                    </p>
                  )}
                  <Button type="button" variant="outline" onClick={unban} disabled={banning} className="w-full">
                    {banning ? 'Working…' : 'Lift ban'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-cocoa">
                    Bans block the user from signing in. The reason is logged and shown on this page.
                  </p>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    rows={3}
                    placeholder="Reason (visible to staff)…"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={ban}
                    disabled={banning || banReason.trim().length < 3}
                    className="w-full rounded-full bg-coral px-5 py-2 text-sm font-semibold text-cream shadow-soft transition-colors hover:bg-corallt disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {banning ? 'Banning…' : 'Ban account'}
                  </button>
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}

      {/* ── Remove-dog modal ───────────────────────────────────────────────── */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 px-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !removing && setRemoveTarget(null)}
        >
          <div className="w-full max-w-md rounded-3xl bg-cream p-7 shadow-glass">
            <h3 className="font-serif text-xl text-charcoal">Remove {removeTarget.name}?</h3>
            <p className="mt-2 text-sm text-cocoa">Provide a brief reason for the user's records.</p>
            <textarea
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              rows={3}
              placeholder="Reason…"
              className={`${inputCls} mt-4`}
              autoFocus
              disabled={removing}
            />
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={() => setRemoveTarget(null)} className="text-sm text-cocoa hover:text-coral disabled:opacity-50" disabled={removing}>Cancel</button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={removing || removeReason.trim().length < 3}
                className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-cream shadow-soft transition-colors hover:bg-corallt disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removing ? 'Removing…' : 'Confirm removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
