import Link from "next/link";

export type TabItem = {
  key: string;
  label: string;
  /**
   * Kleine Zahl hinter dem Namen. Nur setzen, wenn sie zu etwas auffordert —
   * ein reiner Bestandszähler sieht aus wie eine Benachrichtigung und
   * gewöhnt einem ab, überhaupt hinzuschauen.
   */
  count?: number;
  /** Hervorgehoben, wenn die Zahl Handlungsbedarf bedeutet. */
  highlight?: boolean;
};

/**
 * Tabs laufen über die Adresszeile statt über Client-State: Zurück-Knopf und
 * Lesezeichen funktionieren dadurch wie erwartet.
 */
export default function TabNav({
  items,
  active,
  basePath,
  defaultKey = "uebersicht",
}: {
  items: TabItem[];
  active: string;
  basePath: string;
  /** Dieser Reiter liegt auf dem Grundpfad und braucht keinen Parameter. */
  defaultKey?: string;
}) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = item.key === active;

          return (
            <Link
              key={item.key}
              href={item.key === defaultKey ? basePath : `${basePath}?tab=${item.key}`}
              aria-current={isActive ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "border-accent font-medium text-foreground"
                  : "border-transparent text-muted hover:border-border hover:text-foreground"
              }`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={
                    item.highlight
                      ? "ml-1.5 rounded-full bg-accent px-1.5 py-px text-[11px] font-medium text-white"
                      : "ml-1.5 text-xs text-muted"
                  }
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
