import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import Button from '../components/Button';
import PlaceholderImg from '../components/PlaceholderImg';
import { story, trust, externalLinks } from '../data/content';
import { useSiteConfig } from '../context/SiteConfigContext';

export default function About() {
  const { newClientHref } = useSiteConfig();
  return (
    <>
      <SEO
        title="About"
        path="/about"
        description="The story behind Pawsome 4 Pets — a women-led, kennel-free Centurion sanctuary for small and toy-breed dogs."
      />
      <PageHero
        eyebrow="Our Story"
        title="Built on love, run like a home"
        intro="A family-run dog hotel in Centurion where small and toy breeds are welcomed as family — not as guests in a kennel."
      />

      <section className="section container-px space-y-24">
        {story.map((block, i) => {
          const flip = i % 2 === 1;
          return (
            <div key={block.heading} className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal y={30} className={flip ? 'lg:order-2' : ''}>
                {/* REAL PHOTO: /public/assets/images/about-{i+1}.jpg */}
                <PlaceholderImg
                  src={`/assets/images/about-${i + 1}.jpg`}
                  alt={block.heading}
                  className="aspect-[5/4] w-full rounded-3xl object-cover shadow-soft"
                />
              </Reveal>
              <Reveal y={30} delay={0.1} className={flip ? 'lg:order-1' : ''}>
                <span className="eyebrow">Chapter {String(i + 1).padStart(2, '0')}</span>
                <h2 className="h-display mt-3 text-4xl">{block.heading}</h2>
                <p className="mt-5 text-lg leading-relaxed text-cocoa">{block.body}</p>
              </Reveal>
            </div>
          );
        })}
      </section>

      {/* Trust strip */}
      <section className="bg-sand">
        <div className="container-px grid grid-cols-2 gap-8 py-16 md:grid-cols-4">
          {trust.map((t, i) => (
            <Reveal key={t.label} delay={i * 0.08} className="text-center">
              <p className="font-serif text-3xl text-gold sm:text-4xl">{t.value}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-cocoa">{t.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section container-px text-center">
        <Reveal>
          <h2 className="h-display mx-auto max-w-xl text-4xl">Come meet the family</h2>
          <p className="mx-auto mt-4 max-w-xl text-cocoa">
            Read our boarding info, then send through an application — we will be in touch to plan your dog's first stay.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to="/team">Meet The Team</Button>
            <Button to="/info" variant="outline">Boarding Info</Button>
            <Button to={newClientHref} variant="outline">
              New Client Application
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
