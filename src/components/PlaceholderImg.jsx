import { useState } from 'react';

// Renders a real image if present, otherwise an elegant branded placeholder.
// REAL PHOTOS: drop files into /public/assets/images and the matching `src`
// in content.js will load automatically (placeholder disappears).
export default function PlaceholderImg({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-beige to-sand text-cocoa/60 ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="text-center px-4">
          <svg className="mx-auto mb-2 h-8 w-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-7 7c2.5 0 4-1.5 4-3.5S14.5 13 12 13s-4 1.5-4 3.5S9.5 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] uppercase tracking-widest">{alt}</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
