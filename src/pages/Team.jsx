import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import TeamCard from '../components/TeamCard';
import Reveal from '../components/Reveal';
import Button from '../components/Button';
import { team, externalLinks } from '../data/content';
import { useSiteConfig } from '../context/SiteConfigContext';

export default function Team() {
  const { newClientHref } = useSiteConfig();
  return (
    <>
      <SEO
        title="Meet The Team"
        path="/team"
        description="Meet Anzelle and Anton — the women-led, family-run team behind Pawsome 4 Pets in Centurion."
      />
      <PageHero
        eyebrow="The People"
        title="The hearts behind the home"
        intro="A small, devoted, family-run team who treat every dog as one of their own."
      />

      <section className="section container-px">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <TeamCard key={member.name} {...member} delay={i * 0.12} />
          ))}
        </div>

        <Reveal className="mx-auto mt-20 max-w-2xl text-center">
          <p className="font-serif text-2xl italic leading-relaxed text-cocoa">
            &ldquo;We built Pawsome 4 Pets so dogs could feel at home, not in a kennel —
            and so owners could travel without a single worry.&rdquo;
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to={newClientHref}>
              New Client Application
            </Button>
            <Button href={externalLinks.booking} target="_blank" rel="noopener noreferrer" variant="outline">
              Book a Stay
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
