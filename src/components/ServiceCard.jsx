import { motion } from 'framer-motion';
import Icon from './Icon';

export default function ServiceCard({ icon, title, text, note, delay = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group flex h-full flex-col rounded-2xl border border-beige/60 bg-white/50 p-8 backdrop-blur-sm transition-shadow duration-300 hover:shadow-soft"
    >
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-coral/15 text-coral transition-colors group-hover:bg-coral group-hover:text-cream">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-cocoa">{text}</p>
      {note && (
        <p className="mt-4 border-t border-beige/60 pt-3 text-xs italic text-coral">{note}</p>
      )}
    </motion.article>
  );
}
