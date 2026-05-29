import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import Button from '../components/Button';
import DynamicField from '../components/DynamicField';
import { apiFetch } from '../lib/api';
import { evaluateField } from '../lib/formLogic';

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    apiFetch(`/forms/${slug}`, { auth: false })
      .then((d) => setForm(d.form))
      .catch((e) => setError(e.message));
  }, [slug]);

  const setAnswer = (key, value) => setAnswers((a) => ({ ...a, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await apiFetch(`/forms/${slug}/submit`, {
        method: 'POST',
        body: { answers, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.id])) },
        auth: false,
      });
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !form) {
    return (
      <section className="section container-px">
        <div className="mx-auto max-w-xl rounded-3xl bg-white/70 p-10 text-center shadow-glass">
          <h1 className="h-display text-3xl">Form not found</h1>
          <p className="mt-3 text-cocoa">{error}</p>
          <div className="mt-6">
            <Button to="/" variant="outline">Back to home</Button>
          </div>
        </div>
      </section>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <>
        <SEO title={form.title} description={form.description || form.title} />
        <PageHero eyebrow="Thank you!" title="Submission received" intro={success.successMessage || form.successMessage || 'We will get back to you shortly.'} />
        <section className="section container-px">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl rounded-3xl bg-white/70 p-10 text-center shadow-glass"
          >
            <p className="text-sm text-cocoa">Your reference number is</p>
            <p className="mt-1 font-mono text-2xl text-charcoal">#{success.submissionId}</p>
            {success.account?.tempPassword && (
              <div className="mt-8 rounded-2xl border border-gold/40 bg-gold/5 p-5 text-left">
                <p className="text-sm font-semibold text-charcoal">Your account is ready</p>
                <p className="mt-2 text-sm text-cocoa">
                  We've created an account for <strong>{success.account.email}</strong>. Use this temporary
                  password to sign in and set your own:
                </p>
                <p className="mt-3 break-all rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-coral">
                  {success.account.tempPassword}
                </p>
                <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-coral hover:underline">
                  Sign in now →
                </Link>
              </div>
            )}
            <div className="mt-8">
              <Button to="/" variant="outline">Back to home</Button>
            </div>
          </motion.div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title={form.title} description={form.description || form.title} path={`/forms/${slug}`} />
      <PageHero eyebrow="Form" title={form.title} intro={form.description || undefined} />

      <section className="section container-px">
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 rounded-3xl bg-white/70 p-8 shadow-glass sm:p-10">
          {form.fields.map((field) => {
            const { visible, required } = evaluateField(field, answers);
            if (!visible) return null;
            return (
              <DynamicField
                key={field.id}
                field={field}
                value={answers[field.fieldKey]}
                required={required}
                onChange={(v) => setAnswer(field.fieldKey, v)}
                onFileUpload={(u) => setFiles((prev) => ({ ...prev, [field.fieldKey]: u }))}
              />
            );
          })}

          {error && (
            <p className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
              {error}
            </p>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
