"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABELS, type Profile } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/objekte", label: "Objekte" },
  { href: "/benutzer", label: "Benutzer", adminOnly: true },
  { href: "/einstellungen", label: "Einstellungen" },
];

export default function Nav({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  const visible = LINKS.filter((link) => {
    if (link.adminOnly && profile.role !== "admin") return false;
    return true;
  });

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Oylio Rental Dashboard
        </Link>

        <nav className="flex items-center gap-1">
          {visible.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-surface-muted font-medium text-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{profile.full_name || profile.email}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
