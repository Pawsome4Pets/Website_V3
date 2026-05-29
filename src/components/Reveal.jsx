import { motion } from 'framer-motion';

// Reusable scroll-reveal. Lightweight: fades + lifts once when in view.
// Use `delay` to stagger siblings.
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className = '',
  as = 'div',
}) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
