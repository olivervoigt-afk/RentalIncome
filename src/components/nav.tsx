"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LocaleSwitch from "@/components/locale-switch";
import { signOut } from "@/lib/actions/auth";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";
import type { Profile } from "@/lib/types";

export default function Nav({
  profile,
  t,
  locale,
}: {
  profile: Profile;
  t: Dict;
  locale: Locale;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: t.nav.dashboard, exact: true },
    { href: "/ta24", label: t.nav.ta24 },
    { href: "/einnahmen", label: t.nav.income },
    { href: "/benutzer", label: t.nav.users, adminOnly: true },
    { href: "/einstellungen", label: t.nav.settings },
  ].filter((link) => !link.adminOnly || profile.role === "admin");

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
        <Link href="/" className="font-semibold tracking-tight">
          {t.app.name}
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
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
          <LocaleSwitch locale={locale} />

          <div className="text-right leading-tight">
            <p className="text-sm font-medium">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-muted">{t.roles[profile.role]}</p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
