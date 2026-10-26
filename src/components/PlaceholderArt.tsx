/** Consistent stand-in. The exercise `image` path is the slot a real picture replaces later. */
export function PlaceholderArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? 'placeholder-art compact' : 'placeholder-art'}
      viewBox="0 0 160 160"
      aria-hidden="true"
    >
      <rect width="160" height="160" rx="32" fill="#E7F6EA" />
      <circle cx="80" cy="78" r="40" fill="none" stroke="#FF7F5C" strokeWidth="4" />
      <ellipse cx="80" cy="132" rx="42" ry="8" fill="#8FC9A0" />
      <circle cx="80" cy="52" r="12" fill="#3B2A24" />
      <path
        d="M80 66v32M62 84h36M80 98l-14 20M80 98l14 20"
        fill="none"
        stroke="#3B2A24"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
