import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';
import ServiceCard from '../components/ServiceCard';
import Slideshow from '../components/Slideshow';
import PlaceholderImg from '../components/PlaceholderImg';
import Icon from '../components/Icon';
import { useSiteConfig } from '../context/SiteConfigContext';
import {
  services, testimonials, trust, slides, business, externalLinks,
} from '../data/content';

export default function Home() {
  const { newClientHref } = useSiteConfig();
  return (
    <>
      <SEO path="/" />

      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-coral/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />

        <div className="container-px grid items-center gap-12 pb-20 lg:grid-cols-2 lg:pb-28">
          <div>
            <motion.span className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {business.legal}
            </motion.span>
            <motion.h1
              className="h-display mt-4 text-5xl sm:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
            >
              A kennel-free<br />home away from home<br />
              <span className="italic text-coral">for your small dog.</span>
            </motion.h1>
            <motion.p
              className="mt-6 max-w-md text-lg leading-relaxed text-cocoa"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              Centurion's boutique dog hotel & spa. Small and toy-breed
              specialists. No cages — just soft beds, sunlit gardens and
              24-hour human companionship.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            >
              <Button href={externalLinks.booking} target="_blank" rel="noopener noreferrer">
                Book a Stay
              </Button>
              <Button to={newClientHref} variant="outline">
                New Client Application
              </Button>
            </motion.div>
            <motion.div
              className="mt-7 flex items-center gap-3 text-sm text-cocoa"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            >
              <span className="font-serif text-base text-gold">10+ years</span>
              <span>of devoted care experience</span>
            </motion.div>
          </div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* REAL PHOTO: /public/assets/images/hero.jpg */}
            <PlaceholderImg
              src="/assets/images/hero.jpg"
              alt="A happy small-breed dog at Pawsome 4 Pets in Centurion"
              className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-soft"
            />
            <div className="glass absolute -bottom-6 -left-6 hidden items-center gap-3 px-5 py-4 sm:flex">
              <Icon name="paw" className="h-8 w-8 text-coral" />
              <div>
                <p className="font-serif text-xl leading-none">100% Kennel-Free</p>
                <p className="text-xs text-cocoa">Real beds, real love</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- TRUST BAR ---------------- */}
      <section className="border-y border-beige/50 bg-white/40">
        <div className="container-px grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          {trust.map((t, i) => (
            <Reveal key={t.label} delay={i * 0.08} className="text-center">
              <p className="font-serif text-3xl text-gold sm:text-4xl">{t.value}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-cocoa">{t.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- SERVICES OVERVIEW ---------------- */}
      <section className="section container-px">
        <SectionHeading
          eyebrow="What We Offer"
          title="Care, refined to a luxury"
          intro="Boutique services for small and toy-breed dogs, delivered in a calm, home environment."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={s.title} {...s} delay={(i % 3) * 0.1} />
          ))}
        </div>
      </section>

      {/* ---------------- SLIDESHOW ---------------- */}
      <section className="section bg-sand">
        <div className="container-px">
          <SectionHeading eyebrow="Moments" title="A glimpse of the good life" />
          <Reveal className="mt-12">
            {/* REAL PHOTOS: drop slide-1.jpg … slide-10.jpg into /public/assets/images */}
            <Slideshow slides={slides} />
          </Reveal>
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="section container-px">
        <SectionHeading eyebrow="Loved by Owners" title="Tails of happiness" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.author + i} delay={i * 0.1}>
              <figure className="flex h-full flex-col rounded-2xl bg-white/60 p-8 shadow-glass">
                <Icon name="paw" className="h-8 w-8 text-gold/40" />
                <blockquote className="mt-4 flex-1 font-serif text-lg italic leading-relaxed text-charcoal">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-semibold">{t.author}</span>
                  <span className="text-cocoa"> · {t.pet}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section">
        <div className="container-px">
          <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-charcoal px-8 py-16 text-center sm:px-16">
            <Icon name="paw" className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-cream/5" />
            <h2 className="h-display mx-auto max-w-2xl text-4xl text-cream sm:text-5xl">
              Ready to give your dog the stay they deserve?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-cream/70">
              New here? Tell us about your dog with our quick application.
              Existing guests can book directly through our portal.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
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
      </section>
    </>
  );
}
