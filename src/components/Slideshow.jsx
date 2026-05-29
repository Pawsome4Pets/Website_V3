import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlaceholderImg from './PlaceholderImg';

// Cinematic auto-playing slideshow with cross-fade + slow Ken Burns zoom.
// Pauses on hover. Includes prev/next + indicator dots.
export default function Slideshow({ slides, interval = 4500 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((i, dir = 1) => {
    setDirection(dir);
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  const next = useCallback(() => goTo(index + 1, 1),  [index, goTo]);
  const prev = useCallback(() => goTo(index - 1, -1), [index, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, interval);
    return () => clearInterval(t);
  }, [paused, next, interval]);

  // Keyboard nav when focused
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const current = slides[index];

  return (
    <div
      className="group relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-sand shadow-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ opacity: 0, scale: 1.08, x: direction * 40 }}
          animate={{ opacity: 1, scale: 1,    x: 0 }}
          exit={{    opacity: 0, scale: 1,    x: direction * -40 }}
          transition={{
            opacity: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
            scale:   { duration: 6,   ease: 'linear' }, // slow Ken Burns
            x:       { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
          }}
          className="absolute inset-0"
        >
          <PlaceholderImg
            src={current.src}
            alt={current.alt}
            className="h-full w-full object-cover"
          />
          {/* Subtle gradient for caption legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-transparent" />
          {current.alt && (
            <p className="absolute bottom-6 left-6 max-w-xs font-serif text-lg text-cream sm:bottom-8 sm:left-10 sm:text-xl">
              {current.alt}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/80 text-charcoal opacity-0 backdrop-blur-md transition-opacity hover:bg-cream group-hover:opacity-100"
      >‹</button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/80 text-charcoal opacity-0 backdrop-blur-md transition-opacity hover:bg-cream group-hover:opacity-100"
      >›</button>

      {/* Indicators */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > index ? 1 : -1)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === index ? 'w-10 bg-cream' : 'w-1.5 bg-cream/50 hover:bg-cream/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
