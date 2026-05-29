import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import Button from '../components/Button';
import { apiFetch } from '../lib/api';

export default function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    const f = new FormData(e.target);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: { email: f.get('email') },
        auth: false,
      });
      setSent(true);
      // Dev convenience: server returns devResetUrl when not in production.
      if (res?.devResetUrl) setDevUrl(res.devResetUrl);
    } catch (err) {
      setError(err.message || 'Could not send reset link.');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <SEO title="Forgot password" path="/forgot-password" description="Reset your Pawsome 4 Pets password." />
      <AuthCard
        title="Reset your password"
        subtitle="We'll email you a link to set a new one."
        footer={
          <>
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-coral underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </>
        }
      >
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">
              If an account exists for that email, a password reset link has been sent.
              Check your inbox (and the spam folder).
            </p>
            {devUrl && (
              <div className="rounded-xl border border-beige/60 bg-cream/50 px-4 py-3 text-xs text-cocoa">
                <p className="mb-1 font-semibold uppercase tracking-widest">Dev convenience</p>
                <p>Email isn't wired up yet. Use this reset link directly:</p>
                <Link to={devUrl.replace(/^[^/]*\/\/[^/]+/, '')} className="mt-2 block break-all font-mono text-coral underline-offset-2 hover:underline">
                  {devUrl}
                </Link>
              </div>
            )}
            <Button to="/login" variant="outline" className="w-full">Back to sign in</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            {error && (
              <p className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
