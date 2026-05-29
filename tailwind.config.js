/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds (warmer, peach-tinted) ────────────────────
        cream: '#FAEEDC',   // warm peach-cream page base
        sand:  '#F2DDBE',   // warm tan section background
        beige: '#E0BFA0',   // warm mid-tone
        // ── Brand accents (from logo) ─────────────────────────────
        gold:    '#C5B131', // mustard — secondary accent / decorative
        goldlt:  '#D7C44A',
        coral:   '#DB6238', // coral orange — PRIMARY accent (CTAs)
        corallt: '#E87A52',
        // ── Text ───────────────────────────────────────────────────
        charcoal: '#1F5363', // deep petrol teal — primary text
        cocoa:    '#5C7480', // softer teal — secondary text
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans:  ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft:  '0 20px 60px -25px rgba(31,83,99,0.25)',
        glass: '0 8px 32px rgba(31,83,99,0.12)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
      },
      animation: { float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
}
