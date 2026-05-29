import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../lib/api';

const SiteConfigContext = createContext(null);

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState({ newClientFormSlug: null, navForms: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/site-config', { auth: false })
      .then((d) => { if (!cancelled) setConfig({
        newClientFormSlug: d.newClientFormSlug ?? null,
        navForms: Array.isArray(d.navForms) ? d.navForms : [],
      }); })
      .catch(() => { /* offline / not seeded yet — keep defaults */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({
    ...config,
    loading,
    // Resolved href for the "New Client" CTA across the site. Falls back to
    // the public Forms index when no form is bound, so the button never dead-ends.
    newClientHref: config.newClientFormSlug ? `/forms/${config.newClientFormSlug}` : '/forms',
    // True when the bound form exists — used to know if the link is internal.
    newClientIsInternal: !!config.newClientFormSlug,
  }), [config, loading]);

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used inside <SiteConfigProvider>');
  return ctx;
}
