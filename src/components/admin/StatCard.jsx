import { motion } from 'framer-motion';

export default function StatCard({ label, value, hint, accent = 'coral' }) {
  const accents = {
    coral: 'text-coral',
    gold:  'text-gold',
    charcoal: 'text-charcoal',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl bg-white/70 p-6 shadow-glass"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-cocoa">{label}</p>
      <p className={`mt-3 font-serif text-4xl ${accents[accent] || accents.coral}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-cocoa">{hint}</p>}
    </motion.div>
  );
}
