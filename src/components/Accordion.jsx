// Native <details>/<summary> for accessibility + zero JS overhead.
// Renders a stacked list of question/answer items.
export default function Accordion({ items }) {
  return (
    <div className="divide-y divide-beige/60 rounded-2xl border border-beige/60 bg-white/60 backdrop-blur-sm">
      {items.map((item, i) => (
        <details key={i} className="group px-6 py-5 open:bg-white/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg text-charcoal">
            {item.q}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold transition-transform group-open:rotate-45">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-cocoa">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
