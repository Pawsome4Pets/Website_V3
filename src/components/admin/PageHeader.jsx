export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="h-display text-3xl sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-cocoa">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
