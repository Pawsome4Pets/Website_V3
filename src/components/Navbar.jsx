import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { navLinks, business, externalLinks } from '../data/content';
import { useAuth } from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import Button from './Button';
import Icon from './Icon';

// REAL LOGO: drop your file at /public/assets/images/logo.png (or .svg).
// Falls back to the paw icon if the logo isn't present.
const LOGO_SRC = '/assets/images/logo.png';

function Brand() {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2.5">
      {logoFailed ? (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Icon name="paw" className="h-6 w-6" />
        </span>
      ) : (
        <img
          src={LOGO_SRC}
          alt="Pawsome 4 Pets"
          onError={() => setLogoFailed(true)}
          className="h-10 w-10 rounded-full object-cover transition-transform group-hover:scale-105"
        />
      )}
      <span className="font-serif text-xl leading-none tracking-tight text-charcoal">
        {business.name}
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { newClientHref, navForms } = useSiteConfig();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const linkClass = ({ isActive }) =>
    `relative text-sm font-medium transition-colors ${
      isActive ? 'text-gold' : 'text-charcoal hover:text-gold'
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass py-2.5' : 'py-4'
      }`}
    >
      <nav className="container-px flex items-center justify-between gap-4">
        <Brand />

        {/* Desktop links */}
        <ul className="hidden items-center gap-7 xl:flex">
          {navLinks.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className={linkClass} end={l.to === '/'}>
                {l.label}
              </NavLink>
            </li>
          ))}
          {navForms.length > 0 && (
            <li>
              <NavLink to="/forms" className={linkClass}>Forms</NavLink>
            </li>
          )}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 xl:flex">
          <Link
            to={newClientHref}
            className="text-sm font-medium text-charcoal transition-colors hover:text-gold"
          >
            New Client
          </Link>
          {user ? (
            <NavLink to={user.kind === 'admin' ? '/admin' : '/account'} className={linkClass}>
              {user.kind === 'admin' ? 'Admin' : 'My Account'}
            </NavLink>
          ) : (
            <NavLink to="/login" className={linkClass}>Sign in</NavLink>
          )}
          <Button href={externalLinks.booking} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5">
            Book a Stay
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-2 text-charcoal xl:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <div className="space-y-1.5">
            <span className={`block h-0.5 w-6 bg-current transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-6 bg-current transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-current transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="glass mx-6 mt-3 overflow-hidden rounded-2xl xl:hidden"
          >
            <ul className="flex flex-col p-3">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    end={l.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-sm font-medium ${
                        isActive ? 'text-gold' : 'text-charcoal'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
              {navForms.length > 0 && (
                <li>
                  <NavLink
                    to="/forms"
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-sm font-medium ${isActive ? 'text-gold' : 'text-charcoal'}`
                    }
                  >
                    Forms
                  </NavLink>
                </li>
              )}
              <li className="mt-2 border-t border-beige/50 px-1 pt-3">
                <Link
                  to={newClientHref}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-charcoal"
                >
                  New Client Application
                </Link>
              </li>
              <li className="px-1">
                <NavLink
                  to={user ? (user.kind === 'admin' ? '/admin' : '/account') : '/login'}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-charcoal"
                >
                  {user ? (user.kind === 'admin' ? 'Admin Dashboard' : 'My Account') : 'Sign in'}
                </NavLink>
              </li>
              <li className="px-3 pb-2 pt-1">
                <Button
                  href={externalLinks.booking}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Book a Stay ↗
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
