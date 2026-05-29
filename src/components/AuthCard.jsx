import { motion } from 'framer-motion';

// Shared shell for /login and /register so the visual language stays consistent.
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-sand pt-32 pb-20">
      <div className="container-px">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md rounded-3xl bg-white/70 p-8 shadow-glass backdrop-blur-md sm:p-10"
        >
          <h1 className="h-display text-3xl sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-cocoa">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-cocoa">{footer}</div>}
        </motion.div>
      </div>
    </section>
  );
}
