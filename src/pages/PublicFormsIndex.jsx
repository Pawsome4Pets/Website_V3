import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import { useSiteConfig } from '../context/SiteConfigContext';

export default function PublicFormsIndex() {
  const { navForms, loading } = useSiteConfig();

  return (
    <>
      <SEO title="Forms" path="/forms" description="Application and intake forms for new and returning Pawsome 4 Pets guests." />
      <PageHero
        eyebrow="Get Started"
        title="Forms"
        intro="Choose a form below to get started. Each one takes just a few minutes."
      />

      <section className="section container-px">
        <div className="mx-auto max-w-3xl">
          {loading ? (
            <p className="text-center text-sm text-cocoa">Loading…</p>
          ) : navForms.length === 0 ? (
            <div className="rounded-3xl bg-white/70 p-10 text-center shadow-glass">
              <h2 className="font-serif text-2xl text-charcoal">No forms available yet</h2>
              <p className="mt-3 text-cocoa">
                Please check back soon, or get in touch directly.
              </p>
              <div className="mt-6">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-coral px-7 py-3 text-sm font-semibold text-cream shadow-soft transition-colors hover:bg-corallt"
                >
                  Contact us
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-5">
              {navForms.map((f, i) => (
                <Reveal key={f.slug} delay={i * 0.05}>
                  <li>
                    <Link
                      to={`/forms/${f.slug}`}
                      className="group block rounded-3xl bg-white/70 p-7 shadow-glass transition-transform hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="font-serif text-xl text-charcoal transition-colors group-hover:text-coral">
                            {f.title}
                          </h2>
                          {f.description && (
                            <p className="mt-2 text-sm leading-relaxed text-cocoa">
                              {f.description}
                            </p>
                          )}
                        </div>
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral transition-transform group-hover:translate-x-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
