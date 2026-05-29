import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import ServiceCard from '../components/ServiceCard';
import SectionHeading from '../components/SectionHeading';
import Reveal from '../components/Reveal';
import Button from '../components/Button';
import { services, externalLinks } from '../data/content';
import { useSiteConfig } from '../context/SiteConfigContext';

const steps = [
  { n: '01', title: 'Send us your application',  text: 'New here? Complete our quick New Client Application — it tells us about your dog so we can prepare.' },
  { n: '02', title: 'We meet and assess fit',    text: 'For first-time stays we arrange a short temperament assessment to make sure your dog will thrive with our small-breed pack.' },
  { n: '03', title: 'Reserve & check in',        text: 'Existing clients book directly through our online portal. We confirm details and welcome your dog at check-in.' },
];

export default function Services() {
  const { newClientHref } = useSiteConfig();
  return (
    <>
      <SEO
        title="Services"
        path="/services"
        description="Kennel-free boarding, dog spa, grooming, individual & special-needs care, holiday day-care and vet transport for small and toy-breed dogs."
      />
      <PageHero
        eyebrow="What We Offer"
        title="Every comfort, considered"
        intro="A complete suite of boutique services for small and toy-breed dogs, delivered with warmth, patience and expertise."
      />

      <section className="section container-px">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={s.title} {...s} delay={(i % 3) * 0.1} />
          ))}
        </div>

        <Reveal className="mt-12 rounded-2xl border border-gold/30 bg-gold/5 p-6 text-sm text-cocoa">
          <p>
            <strong className="text-charcoal">Admission requirements:</strong> small or toy-breed,
            well-socialised with people and dogs, up-to-date on vaccinations
            (5-in-1, Rabies, Kennel Cough), current tick &amp; flea treatment,
            and recently dewormed. Please see our{' '}
            <a href="/info#vaccinations" className="text-gold underline-offset-4 hover:underline">vaccination requirements</a>{' '}
            for full details.
          </p>
        </Reveal>
      </section>

      <section className="section bg-sand">
        <div className="container-px">
          <SectionHeading eyebrow="How It Works" title="Booking made effortless" />
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1} className="relative">
                <span className="font-serif text-6xl text-gold/30">{s.n}</span>
                <h3 className="mt-2 font-serif text-2xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-cocoa">{s.text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            <Button to={newClientHref}>
              New Client Application
            </Button>
            <Button href={externalLinks.booking} target="_blank" rel="noopener noreferrer" variant="outline">
              Existing Client Booking
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
