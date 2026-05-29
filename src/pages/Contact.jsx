import { useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { business, externalLinks } from '../data/content';
import { useSiteConfig } from '../context/SiteConfigContext';
import Button from '../components/Button';

const details = [
  { icon: 'phone', label: 'Phone',    value: business.phone,    href: `tel:${business.phoneIntl.replace(/\s/g, '')}` },
  { icon: 'mail',  label: 'Email',    value: business.email,    href: `mailto:${business.email}` },
  { icon: 'pin',   label: 'Location', value: business.address },
  { icon: 'clock', label: 'Hours',    value: business.hours },
];

const MIN_MESSAGE = 50;

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [messageLen, setMessageLen] = useState(0);
  const { newClientHref } = useSiteConfig();

  // Builds a formatted WhatsApp message and opens it in a new tab.
  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const fullName = `${f.get('firstName') || ''} ${f.get('surname') || ''}`.trim();
    const lines = [
      'Hello Pawsome 4 Pets! 🐾',
      '',
      `*Name:* ${fullName || '-'}`,
      `*Email:* ${f.get('email') || '-'}`,
      `*Phone:* ${f.get('phone') || '-'}`,
      '',
      '*Message:*',
      f.get('message') || '-',
    ];
    const url = `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  return (
    <>
      <SEO
        title="Contact"
        path="/contact"
        description="Contact Pawsome 4 Pets in Centurion — call, email, WhatsApp or send us a message."
      />
      <PageHero
        eyebrow="Say Hello"
        title="Let's talk about your dog"
        intro="Questions, bookings or a friendly chat — we would love to hear from you."
      />

      <section className="section container-px">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left: info + WhatsApp + map */}
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {details.map((d) => {
                const Inner = (
                  <div className="flex h-full items-start gap-4 rounded-2xl bg-white/60 p-5 shadow-glass transition-shadow hover:shadow-soft">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <Icon name={d.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-cocoa">{d.label}</p>
                      <p className="mt-1 text-sm font-medium leading-snug text-charcoal">{d.value}</p>
                    </div>
                  </div>
                );
                return d.href ? <a key={d.label} href={d.href}>{Inner}</a> : <div key={d.label}>{Inner}</div>;
              })}
            </div>

            <a
              href={`https://wa.me/${business.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-6 py-4 font-semibold text-white shadow-soft transition-transform hover:scale-[1.02]"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z"/></svg>
              Chat on WhatsApp
            </a>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button to={newClientHref} className="w-full">
                New Client Application
              </Button>
              <Button href={externalLinks.booking} target="_blank" rel="noopener noreferrer" variant="outline" className="w-full">
                Book a Stay
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl shadow-glass">
              <iframe
                title="Pawsome 4 Pets location"
                src={business.mapEmbed}
                className="h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Right: form */}
          <div>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center rounded-3xl bg-white/70 p-12 text-center shadow-glass"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z"/></svg>
                </div>
                <h2 className="h-display text-3xl">WhatsApp opened!</h2>
                <p className="mt-3 text-cocoa">
                  Just tap <strong>Send</strong> in WhatsApp to deliver your message.
                  We will reply as soon as we can.
                </p>
                <button
                  onClick={() => { setSent(false); setMessageLen(0); }}
                  className="mt-6 text-sm text-coral underline-offset-4 hover:underline"
                >
                  Send another
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-3xl bg-white/60 p-8 shadow-glass">
                <h2 className="font-serif text-2xl">Send us a message</h2>
                <p className="mt-2 text-sm text-cocoa">
                  Your message will open in WhatsApp pre-filled, ready for you to send.
                  We reply directly in WhatsApp.
                </p>
                <div className="mt-6 grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="First name" name="firstName" required />
                    <Field label="Surname"    name="surname"   required />
                  </div>
                  <Field label="Email" name="email" type="email" required />
                  <Field label="Phone" name="phone" type="tel" />

                  <div>
                    <Field
                      label="Message"
                      name="message"
                      type="textarea"
                      required
                      minLength={MIN_MESSAGE}
                      placeholder={`Tell us a little about your pets and how we can help. Please add dates for your loved one's visit. Minimum ${MIN_MESSAGE} characters.`}
                      onChange={(e) => setMessageLen(e.target.value.length)}
                    />
                    <p className={`mt-1.5 text-right text-xs transition-colors ${
                      messageLen >= MIN_MESSAGE ? 'text-coral' : 'text-cocoa/60'
                    }`}>
                      {messageLen} / {MIN_MESSAGE} characters
                      {messageLen >= MIN_MESSAGE && ' ✓'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-3 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
                    disabled={messageLen < MIN_MESSAGE}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z"/></svg>
                    Send via WhatsApp
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
