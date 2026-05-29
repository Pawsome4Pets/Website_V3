import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const inputCls = 'w-full rounded-xl border border-beige bg-white/70 px-4 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20';

const MAX_DOGS = 5;

// Read-only description of a dog's sex + sterilization for display rows.
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

// Inline radio group. value === '' means "not set".
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

export default function Account() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile draft (only differs from saved when user is editing)
  const [editing, setEditing] = useState(false);
  const [pDraft, setPDraft] = useState({ name: '', surname: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Add-dog form
  const [adding, setAdding] = useState(false);
  const [dogDraft, setDogDraft] = useState({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' });
  const [addingDog, setAddingDog] = useState(false);

  // Edit-dog state (one dog at a time)
  const [editingDogId, setEditingDogId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' });
  const [savingDogId, setSavingDogId] = useState(null);

  // Remove-dog modal
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  const flashSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2000);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { user: me } = await apiFetch('/auth/me');
      setProfile(me);
      setPDraft({ name: me.name || '', surname: me.surname || '', phone: me.phone || '' });
      const { dogs: list } = await apiFetch('/auth/me/dogs');
      setDogs(list);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Profile save ───────────────────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true); setError('');
    try {
      const { user: updated } = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: {
          name: pDraft.name.trim() || null,
          surname: pDraft.surname.trim() || null,
          phone: pDraft.phone.trim() || null,
        },
      });
      setProfile((p) => ({ ...p, ...updated }));
      setEditing(false);
      flashSuccess('Profile updated.');
    } catch (err) { setError(err.message); }
    finally { setSavingProfile(false); }
  };

  // ── Dog add ────────────────────────────────────────────────────────────────
  const submitAddDog = async (e) => {
    e.preventDefault();
    if (!dogDraft.name.trim()) return;
    setAddingDog(true); setError('');
    try {
      const { dog } = await apiFetch('/auth/me/dogs', {
        method: 'POST',
        body: {
          name: dogDraft.name.trim(),
          breed: dogDraft.breed.trim() || null,
          birthDate: dogDraft.birthDate || null,
          sex: dogDraft.sex || null,
          isSterilized: dogDraft.isSterilized === '' ? null : dogDraft.isSterilized === 'yes',
          notes: dogDraft.notes.trim() || null,
        },
      });
      setDogs((arr) => [...arr, dog]);
      setDogDraft({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' });
      setAdding(false);
      flashSuccess(`Added ${dog.name}.`);
    } catch (err) { setError(err.message); }
    finally { setAddingDog(false); }
  };

  // ── Dog edit ───────────────────────────────────────────────────────────────
  const startEditDog = (dog) => {
    setEditingDogId(dog.id);
    setEditDraft({
      name: dog.name || '',
      breed: dog.breed || '',
      birthDate: dog.birthDate ? new Date(dog.birthDate).toISOString().slice(0, 10) : '',
      sex: dog.sex || '',
      isSterilized: dog.isSterilized === true ? 'yes' : dog.isSterilized === false ? 'no' : '',
      notes: dog.notes || '',
    });
  };

  const saveDogEdit = async (id) => {
    setSavingDogId(id); setError('');
    try {
      const { dog } = await apiFetch(`/auth/me/dogs/${id}`, {
        method: 'PATCH',
        body: {
          name: editDraft.name.trim(),
          breed: editDraft.breed.trim() || null,
          birthDate: editDraft.birthDate || null,
          sex: editDraft.sex || null,
          isSterilized: editDraft.isSterilized === '' ? null : editDraft.isSterilized === 'yes',
          notes: editDraft.notes.trim() || null,
        },
      });
      setDogs((arr) => arr.map((d) => d.id === id ? dog : d));
      setEditingDogId(null);
      flashSuccess('Saved.');
    } catch (err) { setError(err.message); }
    finally { setSavingDogId(null); }
  };

  // ── Dog remove (with reason) ───────────────────────────────────────────────
  const confirmRemove = async () => {
    if (!removeTarget || removeReason.trim().length < 3) return;
    setRemoving(true); setError('');
    try {
      await apiFetch(`/auth/me/dogs/${removeTarget.id}`, {
        method: 'DELETE',
        body: { removalReason: removeReason.trim() },
      });
      setDogs((arr) => arr.filter((d) => d.id !== removeTarget.id));
      setRemoveTarget(null); setRemoveReason('');
      flashSuccess(`Removed ${removeTarget.name}.`);
    } catch (err) { setError(err.message); }
    finally { setRemoving(false); }
  };

  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(' ').trim();

  return (
    <>
      <SEO title="My account" path="/account" description="Your Pawsome 4 Pets account." />
      <PageHero
        eyebrow="My Account"
        title={profile?.name ? `Hello, ${profile.name.split(' ')[0]}` : 'Hello there'}
        intro="Manage your details and the dogs on your profile."
      />

      <section className="section container-px">
        {error && <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}
        {success && <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">{success}</div>}

        {loading ? (
          <p className="text-center text-sm text-cocoa">Loading…</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8">
            {/* ── Profile card ─────────────────────────────────────────────── */}
            <div className="rounded-3xl bg-white/70 p-7 shadow-glass">
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">Profile</p>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-sm font-semibold text-coral hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="mt-3 space-y-1">
                  <h3 className="font-serif text-2xl text-charcoal">{fullName || '—'}</h3>
                  <p className="text-sm text-cocoa">{profile?.email}</p>
                  {profile?.phone && <p className="text-sm text-cocoa">{profile.phone}</p>}
                  {profile?.role?.name && (
                    <span className="mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
                      {profile.role.name}
                    </span>
                  )}
                </div>
              ) : (
                <form onSubmit={saveProfile} className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">First name</span>
                      <input
                        value={pDraft.name}
                        onChange={(e) => setPDraft((d) => ({ ...d, name: e.target.value }))}
                        className={`${inputCls} mt-1`}
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Surname</span>
                      <input
                        value={pDraft.surname}
                        onChange={(e) => setPDraft((d) => ({ ...d, surname: e.target.value }))}
                        className={`${inputCls} mt-1`}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Phone</span>
                    <input
                      value={pDraft.phone}
                      onChange={(e) => setPDraft((d) => ({ ...d, phone: e.target.value }))}
                      className={`${inputCls} mt-1`}
                      placeholder="+27 …"
                    />
                  </label>
                  <p className="text-xs text-cocoa">Email: <span className="font-mono">{profile?.email}</span> (can't be changed here)</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Saving…' : 'Save'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setPDraft({ name: profile?.name || '', surname: profile?.surname || '', phone: profile?.phone || '' }); }}
                      className="text-sm text-cocoa hover:text-coral"
                      disabled={savingProfile}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ── Dogs card ───────────────────────────────────────────────── */}
            <div className="rounded-3xl bg-white/70 p-7 shadow-glass">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="eyebrow">My Dogs</p>
                  <p className="mt-1 text-xs text-cocoa">
                    {dogs.length} of {MAX_DOGS} slots used.
                  </p>
                </div>
                {!adding && dogs.length < MAX_DOGS && (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="text-sm font-semibold text-coral hover:underline"
                  >
                    + Add a dog
                  </button>
                )}
              </div>

              {dogs.length === 0 && !adding && (
                <p className="mt-4 text-sm text-cocoa">
                  You haven't added any dogs yet. Add one to speed up future bookings and applications.
                </p>
              )}

              {/* Add-dog form */}
              {adding && (
                <form onSubmit={submitAddDog} className="mt-5 space-y-4 rounded-2xl border border-beige/60 bg-cream/40 p-5">
                  <h4 className="font-serif text-base text-charcoal">Add a dog</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Name *</span>
                      <input
                        required value={dogDraft.name}
                        onChange={(e) => setDogDraft((d) => ({ ...d, name: e.target.value }))}
                        className={`${inputCls} mt-1`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Breed</span>
                      <input
                        value={dogDraft.breed}
                        onChange={(e) => setDogDraft((d) => ({ ...d, breed: e.target.value }))}
                        className={`${inputCls} mt-1`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Birth date</span>
                      <input
                        type="date" value={dogDraft.birthDate}
                        onChange={(e) => setDogDraft((d) => ({ ...d, birthDate: e.target.value }))}
                        className={`${inputCls} mt-1`}
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RadioGroup
                      label="Sex"
                      name="add-sex"
                      value={dogDraft.sex}
                      onChange={(v) => setDogDraft((d) => ({ ...d, sex: v }))}
                      options={SEX_OPTIONS}
                      disabled={addingDog}
                    />
                    <RadioGroup
                      label="Sterilization"
                      name="add-sterilized"
                      value={dogDraft.isSterilized}
                      onChange={(v) => setDogDraft((d) => ({ ...d, isSterilized: v }))}
                      options={STERILIZED_OPTIONS}
                      disabled={addingDog}
                    />
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Notes</span>
                    <textarea
                      rows={2} value={dogDraft.notes}
                      onChange={(e) => setDogDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Allergies, temperament, favourite treat…"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={addingDog || !dogDraft.name.trim()}>
                      {addingDog ? 'Adding…' : 'Add dog'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setAdding(false); setDogDraft({ name: '', breed: '', birthDate: '', sex: '', isSterilized: '', notes: '' }); }}
                      className="text-sm text-cocoa hover:text-coral"
                      disabled={addingDog}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Dog list */}
              {dogs.length > 0 && (
                <ul className="mt-6 space-y-4">
                  {dogs.map((dog) => {
                    const isEditing = editingDogId === dog.id;
                    return (
                      <li key={dog.id} className="rounded-2xl border border-beige/60 bg-cream/30 p-5">
                        {!isEditing ? (
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-serif text-lg text-charcoal">{dog.name}</h4>
                              <p className="text-xs text-cocoa">
                                {dog.breed || 'Breed not set'}
                                {dog.birthDate && ` · ${new Date(dog.birthDate).toLocaleDateString()}`}
                              </p>
                              {dogTraits(dog) && (
                                <p className="mt-0.5 text-xs text-cocoa">{dogTraits(dog)}</p>
                              )}
                              {dog.notes && <p className="mt-2 text-sm leading-relaxed text-charcoal">{dog.notes}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <button
                                type="button"
                                onClick={() => startEditDog(dog)}
                                className="text-sm font-semibold text-coral hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRemoveTarget(dog); setRemoveReason(''); }}
                                className="text-sm text-cocoa hover:text-coral"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Name *</span>
                                <input
                                  value={editDraft.name}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                                  className={`${inputCls} mt-1`}
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Breed</span>
                                <input
                                  value={editDraft.breed}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, breed: e.target.value }))}
                                  className={`${inputCls} mt-1`}
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Birth date</span>
                                <input
                                  type="date" value={editDraft.birthDate}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, birthDate: e.target.value }))}
                                  className={`${inputCls} mt-1`}
                                />
                              </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <RadioGroup
                                label="Sex"
                                name={`edit-sex-${dog.id}`}
                                value={editDraft.sex}
                                onChange={(v) => setEditDraft((d) => ({ ...d, sex: v }))}
                                options={SEX_OPTIONS}
                                disabled={savingDogId === dog.id}
                              />
                              <RadioGroup
                                label="Sterilization"
                                name={`edit-sterilized-${dog.id}`}
                                value={editDraft.isSterilized}
                                onChange={(v) => setEditDraft((d) => ({ ...d, isSterilized: v }))}
                                options={STERILIZED_OPTIONS}
                                disabled={savingDogId === dog.id}
                              />
                            </div>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">Notes</span>
                              <textarea
                                rows={2} value={editDraft.notes}
                                onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                                className={`${inputCls} mt-1`}
                              />
                            </label>
                            <div className="flex items-center gap-3">
                              <Button type="button" onClick={() => saveDogEdit(dog.id)} disabled={savingDogId === dog.id || !editDraft.name.trim()}>
                                {savingDogId === dog.id ? 'Saving…' : 'Save'}
                              </Button>
                              <button
                                type="button"
                                onClick={() => setEditingDogId(null)}
                                className="text-sm text-cocoa hover:text-coral"
                                disabled={savingDogId === dog.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* ── Footer actions ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4">
              <Button to="/" variant="outline">Back to home</Button>
              <button
                onClick={logout}
                className="rounded-full px-5 py-2 text-sm font-medium text-cocoa underline-offset-4 hover:text-coral hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Remove-dog modal ───────────────────────────────────────────────── */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 px-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !removing && setRemoveTarget(null)}
        >
          <div className="w-full max-w-md rounded-3xl bg-cream p-7 shadow-glass">
            <h3 className="font-serif text-xl text-charcoal">Remove {removeTarget.name}?</h3>
            <p className="mt-2 text-sm text-cocoa">
              Tell us briefly why you're removing this dog from your profile. This stays on
              your account history but the dog will no longer appear here.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-widest text-cocoa">
                Reason for removal <span className="text-coral">*</span>
              </span>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={3}
                className={`${inputCls} mt-1`}
                placeholder="e.g. Passed away, rehomed, allergy resolved…"
                autoFocus
                disabled={removing}
              />
            </label>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRemoveTarget(null); setRemoveReason(''); }}
                className="text-sm text-cocoa hover:text-coral disabled:opacity-50"
                disabled={removing}
              >
                Cancel
              </button>
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
