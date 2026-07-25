"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Blendet archivierte und abgelaufene Objekte ein bzw. aus. */
export default function ArchiveToggle({
  active,
  count,
}: {
  active: boolean;
  count: number;
}) {
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams());

  if (active) params.delete("archiv");
  else params.set("archiv", "1");

  const query = params.toString();

  // Hervorgehoben, solange etwas verborgen ist — sonst wird übersehen,
  // dass die Liste unvollständig ist.
  const highlighted = !active && count > 0;

  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
        highlighted
          ? "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
          : "border border-border text-muted hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      {active ? (
        "Archiv ausblenden"
      ) : count > 0 ? (
        <>
          {count} {count === 1 ? "Objekt" : "Objekte"} ausgeblendet — einblenden
        </>
      ) : (
        "Archiv einblenden"
      )}
    </Link>
  );
}
