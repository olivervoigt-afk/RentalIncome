/**
 * Bildmarke: ein Haus als Aussparung in einem vollen Quadrat.
 *
 * Zwei Anläufe davor scheiterten daran, dass schlichte Formen im Quadrat mit
 * Bedienzeichen verwechselbar sind: drei gestapelte Balken lasen sich wie ein
 * Menüsymbol, ein Winkel über einem Strich wie "Auswerfen". Eine gefüllte
 * Fläche mit ausgesparter Hausform hat dieses Problem nicht — sie ist eine
 * Marke und kein Knopf.
 *
 * Fläche in der Akzentfarbe, Aussparung in der Hintergrundfarbe; damit
 * funktioniert sie in beiden Farbschemata ohne zweite Datei.
 */
export default function Logo({
  className = "size-5",
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="8.5" fill="var(--accent)" />
      {/* Giebel, Wände, Sockel — eine geschlossene Form, kein Strichzeichen. */}
      <path
        d="M16 7.4 24.6 15v9.6a1.6 1.6 0 0 1-1.6 1.6H9a1.6 1.6 0 0 1-1.6-1.6V15z"
        fill="var(--surface)"
      />
      {/* Tür: gibt der Fläche Massstab und macht das Haus auch klein lesbar. */}
      <path d="M13.6 26.2v-6a2.4 2.4 0 0 1 4.8 0v6z" fill="var(--accent)" />
    </svg>
  );
}
