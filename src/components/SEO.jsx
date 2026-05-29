import { Helmet } from 'react-helmet-async';
import { business } from '../data/content';

// Per-page SEO. Drop <SEO title="..." description="..." /> at the top of a page.
export default function SEO({ title, description, path = '' }) {
  const fullTitle = title
    ? `${title} · ${business.name}`
    : `${business.name} — Luxury Dog Hotel & Spa, Centurion`;
  const desc = description || business.tagline;
  const url = `${business.website}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
    </Helmet>
  );
}
