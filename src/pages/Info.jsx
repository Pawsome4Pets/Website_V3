import { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import Accordion from '../components/Accordion';
import Button from '../components/Button';
import Icon from '../components/Icon';
import {
  policies, vaccinations, whatToBring, faqs, externalLinks,
} from '../data/content';
import { useSiteConfig } from '../context/SiteConfigContext';

const sections = [
  { id: 'policies',     label: 'Boarding Policies' },
  { id: 'vaccinations', label: 'Vaccinations' },
  { id: 'bring',        label: 'What to Bring' },
  { id: 'faq',          label: 'FAQ' },
];

export default function Info() {
  const [active, setActive] = useState('policies');
  const { newClientHref } = useSiteConfig();

  // Highlight the section currently in view in the sticky sub-nav.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: '-40% 0px -50% 0px' }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <SEO
        title="Boarding Info"
        path="/info"
        description="Boarding policies, vaccination requirements, what to bring and frequently asked questions for guests at Pawsome 4 Pets."
      />
      <PageHero
        eyebrow="Guest Guide"
        title="Everything you need to know"
        intro="Clear, calm and complete — boarding policies, vaccination requirements, packing list and answers to common questions."
      />

      {/* Sticky sub-nav */}
      <div className="sticky top-[72px] z-30 border-y border-beige/50 bg-cream/85 backdrop-blur-md">
        <nav className="container-px flex gap-1 overflow-x-auto py-3 text-sm">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`whitespace-nowrap rounded-full px-4 py-2 transition-colors ${
                active === s.id
                  ? 'bg-gold text-cream'
                  : 'text-cocoa hover:text-gold'
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="container-px space-y-24 py-16">
        {/* ---- Boarding Policies ---- */}
        <section id="policies" className="scroll-mt-32">
          <Reveal>
            <span className="eyebrow">01 · Policies</span>
            <h2 className="h-display mt-3 text-4xl">Boarding Policies</h2>
            <p className="mt-4 max-w-2xl text-cocoa">
              Clear, gentle ground rules that keep every guest safe, calm and well-cared-for.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {policies.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 0.08}>
                <div className="h-full rounded-2xl border border-beige/60 bg-white/60 p-6 backdrop-blur-sm">
                  <h3 className="font-serif text-xl">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cocoa">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- Vaccinations ---- */}
        <section id="vaccinations" className="scroll-mt-32">
          <Reveal>
            <span className="eyebrow">02 · Health</span>
            <h2 className="h-display mt-3 text-4xl">Vaccination Requirements</h2>
            <p className="mt-4 max-w-2xl text-cocoa">
              These requirements protect every guest under our roof. Please bring proof of current vaccinations at check-in.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="rounded-2xl bg-white/60 p-7 shadow-glass">
                <h3 className="flex items-center gap-3 font-serif text-xl">
                  <Icon name="shield" className="h-5 w-5 text-gold" /> Required & Recommended
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-cocoa">
                  {vaccinations.required.map((v) => (
                    <li key={v} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-2xl bg-white/60 p-7 shadow-glass">
                <h3 className="flex items-center gap-3 font-serif text-xl">
                  <Icon name="heart" className="h-5 w-5 text-gold" /> The Rules
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-cocoa">
                  {vaccinations.rules.map((r) => (
                    <li key={r} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <p className="mt-8 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm italic text-cocoa">
              {vaccinations.disclaimer}
            </p>
          </Reveal>
        </section>

        {/* ---- What to Bring ---- */}
        <section id="bring" className="scroll-mt-32">
          <Reveal>
            <span className="eyebrow">03 · Packing List</span>
            <h2 className="h-display mt-3 text-4xl">What to Bring</h2>
            <p className="mt-4 max-w-2xl text-cocoa">
              A short, simple list to make your dog feel at home from the very first wag.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whatToBring.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-2xl bg-sand/60 p-6">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Icon name="paw" className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cocoa">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section id="faq" className="scroll-mt-32">
          <Reveal>
            <span className="eyebrow">04 · Questions</span>
            <h2 className="h-display mt-3 text-4xl">Frequently Asked</h2>
            <p className="mt-4 max-w-2xl text-cocoa">
              Honest answers to the questions we hear most often.
            </p>
          </Reveal>
          <div className="mt-10">
            <Accordion items={faqs} />
          </div>
        </section>

        {/* CTA */}
        <Reveal className="rounded-3xl bg-charcoal px-8 py-14 text-center text-cream">
          <h2 className="h-display text-3xl sm:text-4xl">Ready to plan your stay?</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/70">
            New here? Complete our quick application. Existing guests can book directly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to={newClientHref}>
              New Client Application
            </Button>
            <Button
              href={externalLinks.booking}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              className="border-cream/30 text-cream hover:border-coral hover:text-coral"
            >
              Book a Stay
            </Button>
          </div>
        </Reveal>
      </div>
    </>
  );
}
