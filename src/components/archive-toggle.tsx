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

  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      {active
        ? "Archiv ausblenden"
        : `Archiv einblenden${count > 0 ? ` (${count})` : ""}`}
    </Link>
  );
}
