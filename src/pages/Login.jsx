import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/account';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const f = new FormData(e.target);
    try {
      const user = await login({ email: f.get('email'), password: f.get('password') });
      navigate(user.kind === 'admin' ? '/admin' : redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Sign in" path="/login" description="Sign in to your Pawsome 4 Pets account." />
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to manage your bookings and applications."
        footer={
          <>New here?{' '}
            <Link to="/register" className="font-semibold text-coral underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Password" name="password" type="password" required autoComplete="current-password" minLength={1} />

          <div className="text-right text-xs">
            <Link to="/forgot-password" className="text-cocoa hover:text-coral">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </AuthCard>
    </>
  );
}
