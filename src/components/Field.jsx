// Reusable labelled field. type='textarea' or type='select' switch element.
export default function Field({
  label,
  name,
  type = 'text',
  options = [],
  required = false,
  ...props
}) {
  const base =
    'mt-2 w-full rounded-xl border border-beige bg-white/70 px-4 py-3 text-sm text-charcoal outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20';

  return (
    <label className="block">
      <span className="text-sm font-medium text-charcoal">
        {label}{required && <span className="text-gold"> *</span>}
      </span>

      {type === 'textarea' ? (
        <textarea name={name} required={required} rows={4} className={base} {...props} />
      ) : type === 'select' ? (
        <select name={name} required={required} className={base} defaultValue="" {...props}>
          <option value="" disabled>Select an option</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input type={type} name={name} required={required} className={base} {...props} />
      )}
    </label>
  );
}
