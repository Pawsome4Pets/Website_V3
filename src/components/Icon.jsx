// Lightweight inline icon set (keeps the bundle free of an icon library).
const paths = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9',
  spa: 'M12 3c3 4 3 7 0 10-3-3-3-6 0-10ZM4 13c4 1 6 3 7 7-4 0-6-2-7-7Zm16 0c-4 1-6 3-7 7 4 0 6-2 7-7Z',
  scissors: 'M6 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 6 14 8M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-6 14-8',
  heart: 'M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5C19 15.5 12 20 12 20Z',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  shield: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L21 13l-2 6h-1A15 15 0 0 1 5 6Z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  pin: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  paw: 'M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-7 7c2.5 0 4-1.5 4-3.5S14.5 13 12 13s-4 1.5-4 3.5S9.5 21 12 21Z',
};

export default function Icon({ name, className = 'w-6 h-6' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
