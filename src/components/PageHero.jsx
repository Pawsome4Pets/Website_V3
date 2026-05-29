import { motion } from 'framer-motion';
import Icon from './Icon';

// Compact hero used at the top of inner pages.
export default function PageHero({ eyebrow, title, intro }) {
  return (
    <section className="relative overflow-hidden bg-sand pt-36 pb-20 sm:pt-44 sm:pb-24">
      {/* Floating decorative paw */}
      <Icon name="paw" className="pointer-events-none absolute -right-6 top-28 h-40 w-40 animate-float text-gold/10" />
      <div className="container-px text-center">
        {eyebrow && (
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {eyebrow}
          </motion.span>
        )}
        <motion.h1
          className="h-display mx-auto mt-4 max-w-3xl text-5xl sm:text-6xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          {title}
        </motion.h1>
        {intro && (
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-cocoa"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
          >
            {intro}
          </motion.p>
        )}
      </div>
    </section>
  );
}
