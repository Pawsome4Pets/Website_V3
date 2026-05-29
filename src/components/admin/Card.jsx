export default function Card({ children, className = '', title, action }) {
  return (
    <section className={`rounded-2xl bg-white/70 p-6 shadow-glass ${className}`}>
      {(title || action) && (
        <header className="mb-5 flex items-center justify-between gap-3">
          {title && <h3 className="font-serif text-lg text-charcoal">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
