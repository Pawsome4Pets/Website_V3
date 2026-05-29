import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Variants: 'gold' (primary, now coral) | 'outline' (secondary) | 'mustard' (alt accent)
const styles = {
  gold:    'bg-coral text-cream hover:bg-corallt shadow-soft',
  outline: 'border border-charcoal/30 text-charcoal hover:border-coral hover:text-coral',
  mustard: 'bg-gold text-cream hover:bg-goldlt shadow-soft',
};

export default function Button({
  children,
  to,
  href,
  type = 'button',
  variant = 'gold',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold tracking-wide transition-colors duration-300';
  const cls = `${base} ${styles[variant]} ${className}`;
  const motionProps = { whileHover: { scale: 1.04 }, whileTap: { scale: 0.97 } };

  if (to)
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link to={to} className={cls} {...props}>{children}</Link>
      </motion.div>
    );

  if (href)
    return (
      <motion.a href={href} className={cls} {...motionProps} {...props}>
        {children}
      </motion.a>
    );

  return (
    <motion.button type={type} className={cls} {...motionProps} {...props}>
      {children}
    </motion.button>
  );
}
