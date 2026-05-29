import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import Button from '../components/Button';
import { apiFetch } from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    const f = new FormData(e.target);
    const password = f.get('password');
    const confirm = f.get('confirm');
    if (password !== confirm) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
        auth: false,
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally { setSubmitting(false); }
  };

  if (!token) {
    return (
      <>
        <SEO title="Reset password" path="/reset-password" />
        <AuthCard
          title="Missing reset token"
          subtitle="This page needs to be opened from the link in your reset email."
          footer={
            <Link to="/forgot-password" className="font-semibold text-coral underline-offset-4 hover:underline">
              Request a new link
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <SEO title="Reset password" path="/reset-password" />
      <AuthCard
        title="Choose a new password"
        subtitle="Pick something at least 8 characters."
        footer={
          <Link to="/login" className="font-semibold text-coral underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">
              Password updated. Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <Field label="Confirm new password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            {error && (
              <p className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
