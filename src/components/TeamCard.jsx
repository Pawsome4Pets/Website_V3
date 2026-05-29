import { motion } from 'framer-motion';
import PlaceholderImg from './PlaceholderImg';

export default function TeamCard({ name, role, image, bio, delay = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-3xl bg-white/60 shadow-glass"
    >
      {/* REAL PHOTO: place file at the path set in content.js (team.image) */}
      <div className="aspect-[4/5] overflow-hidden">
        <PlaceholderImg
          src={image}
          alt={`${name} — ${role}`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="p-7">
        <span className="eyebrow">{role}</span>
        <h3 className="mt-2 font-serif text-3xl">{name}</h3>
        <p className="mt-4 text-sm leading-relaxed text-cocoa">{bio}</p>
      </div>
    </motion.article>
  );
}
