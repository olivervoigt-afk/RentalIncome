/**
 * Kleine Flaggen für die Sprachwahl. Bewusst als SVG statt als Emoji:
 * Windows zeigt Flaggen-Emoji nur als Buchstabenpaar an.
 */
const FRAME =
  "block h-[14px] w-[20px] rounded-[3px] ring-1 ring-black/15 dark:ring-white/20";

export function FlagDE({ title }: { title?: string }) {
  return (
    <svg viewBox="0 0 5 3" className={FRAME} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <rect width="5" height="1" y="0" fill="#000000" />
      <rect width="5" height="1" y="1" fill="#dd0000" />
      <rect width="5" height="1" y="2" fill="#ffce00" />
    </svg>
  );
}

export function FlagUK({ title }: { title?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={FRAME} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <clipPath id="union-jack-quarters">
        {/* Nur je eine Hälfte der Diagonalen bekommt Rot — daher der Beschnitt. */}
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>

      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath="url(#union-jack-quarters)"
        stroke="#c8102e"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
