import Reveal from './Reveal';

// Reused on every page for the eyebrow + heading + intro pattern.
export default function SectionHeading({ eyebrow, title, intro, center = true }) {
  return (
    <Reveal className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="h-display mt-3 text-4xl sm:text-5xl">{title}</h2>
      {intro && <p className="mt-5 text-lg leading-relaxed text-cocoa">{intro}</p>}
    </Reveal>
  );
}
