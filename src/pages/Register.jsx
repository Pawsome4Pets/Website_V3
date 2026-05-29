import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const MIN_PASSWORD = 8;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mismatch) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    const f = new FormData(e.target);
    try {
      await register({
        email: f.get('email'),
        password: f.get('password'),
        name: f.get('name') || undefined,
        phone: f.get('phone') || undefined,
      });
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Create account" path="/register" description="Create your Pawsome 4 Pets account." />
      <AuthCard
        title="Create your account"
        subtitle="Save your details once and book or apply faster next time."
        footer={
          <>Already have an account?{' '}
            <Link to="/login" className="font-semibold text-coral underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Your name" name="name" autoComplete="name" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <p className="text-xs text-cocoa">At least {MIN_PASSWORD} characters.</p>

          {(error || mismatch) && (
            <p className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
              {mismatch ? 'Passwords do not match.' : error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || mismatch}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </AuthCard>
    </>
  );
}
