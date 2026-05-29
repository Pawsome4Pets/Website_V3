import { Link } from 'react-router-dom';
import { navLinks, business, externalLinks } from '../data/content';
import { useSiteConfig } from '../context/SiteConfigContext';
import Icon from './Icon';

const Social = ({ href, label, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 text-cream/70 transition-colors hover:border-goldlt hover:text-goldlt"
  >
    {children}
  </a>
);

export default function Footer() {
  const { newClientHref, navForms } = useSiteConfig();
  return (
    <footer className="bg-charcoal text-cream/80">
      <div className="container-px grid gap-12 py-16 md:grid-cols-4">
        {/* Brand */}
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2 font-serif text-2xl text-cream">
            <Icon name="paw" className="h-6 w-6 text-goldlt" />
            {business.name}
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
            {business.tagline}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Social href={business.social.instagram} label="Instagram">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
              </svg>
            </Social>
            <Social href={business.social.facebook} label="Facebook">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M13 22v-8h2.5l.5-3H13v-2c0-.9.3-1.5 1.5-1.5H16V4.1c-.3 0-1.2-.1-2.3-.1C11.4 4 10 5.3 10 7.7V10H8v3h2v9h3z" />
              </svg>
            </Social>
          </div>
        </div>

        {/* Explore */}
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-goldlt">Explore</h4>
          <ul className="grid grid-cols-1 gap-2 text-sm">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-cream/70 transition-colors hover:text-goldlt">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Booking */}
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-goldlt">Booking</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={externalLinks.booking} target="_blank" rel="noopener noreferrer" className="text-cream/70 hover:text-goldlt">
                Book a Stay ↗
              </a>
            </li>
            <li>
              <Link to={newClientHref} className="text-cream/70 hover:text-goldlt">
                New Client Application
              </Link>
            </li>
            {navForms.length > 0 && (
              <li>
                <Link to="/forms" className="text-cream/70 hover:text-goldlt">All Forms</Link>
              </li>
            )}
            <li>
              <Link to="/info" className="text-cream/70 hover:text-goldlt">Boarding Info</Link>
            </li>
            <li>
              <Link to="/info#vaccinations" className="text-cream/70 hover:text-goldlt">Vaccination Requirements</Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-goldlt">Get in Touch</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-goldlt" />
              <a href={`tel:${business.phoneIntl.replace(/\s/g, '')}`} className="hover:text-goldlt">{business.phone}</a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-goldlt" />
              <a href={`mailto:${business.email}`} className="hover:text-goldlt">{business.email}</a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-goldlt" /> {business.address}
            </li>
            <li className="flex items-start gap-3">
              <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-goldlt" /> {business.hours}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-6 text-xs text-cream/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {business.legal}. All rights reserved.</p>
          <p>Crafted with care for happy dogs.</p>
        </div>
      </div>
    </footer>
  );
}
