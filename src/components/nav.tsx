"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LocaleSwitch from "@/components/locale-switch";
import Logo from "@/components/logo";
import { signOut } from "@/lib/actions/auth";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";
import type { Profile } from "@/lib/types";

/** Zahnrad aus acht Zähnen und zwei Ringen — bewusst feingliedrig gehalten. */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true" focusable="false">
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="11.2"
          y="1.8"
          width="1.6"
          height="3.6"
          rx="0.8"
          fill="currentColor"
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

/** Sprechblase mit abgesetzter Spitze. */
function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 14a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Tür mit Pfeil nach draussen. */
function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </svg>
  );
}

export default function Nav({
  profile,
  t,
  locale,
  unreadNotes,
}: {
  profile: Profile;
  t: Dict;
  locale: Locale;
  /** Ungelesene Notizen; erscheinen als Zahl am Sprechblasen-Symbol. */
  unreadNotes: number;
}) {
  const pathname = usePathname();

  // Das Dashboard erreicht man über den Namen links, Verwaltung und
  // Benutzer über das Zahnrad — beide brauchen keinen eigenen Eintrag.
  // Übrig bleibt, was man täglich braucht.
  const links = [
    { href: "/auswertungen", label: t.nav.reports },
    // Kaufpreise gehen Leser nichts an; die Datenbank gäbe ihnen ohnehin
    // nichts heraus, hier verschwindet auch der Weg dorthin.
    ...(profile.role === "viewer" ? [] : [{ href: "/investitionen", label: t.nav.yield }]),
  ];

  const onSettings = pathname.startsWith("/einstellungen");
  const onNotes = pathname.startsWith("/notizen");

  const iconButton = (active: boolean) =>
    `rounded-full p-2 transition-colors ${
      active
        ? "bg-surface-muted text-foreground"
        : "text-muted hover:bg-surface-muted hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          <Logo className="size-[22px]" />
          <span>
            Oylio <span className="font-normal text-muted">Rental</span>
          </span>
        </Link>

        <nav className="ml-8 flex items-center gap-6">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`text-[13px] transition-colors ${
                  active
                    ? "font-medium text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitch locale={locale} />

          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

          <span className="hidden text-[13px] text-muted sm:inline">
            {profile.full_name || profile.email}
          </span>

          {/* Notizen sind kein Ort, den man ansteuert, sondern etwas, das
              ankommt — deshalb ein Symbol mit Anzeige statt eines Eintrags
              in der Zeile. */}
          <Link
            href="/notizen"
            title={t.nav.notes}
            aria-label={
              unreadNotes > 0
                ? `${t.nav.notes} (${unreadNotes})`
                : t.nav.notes
            }
            aria-current={onNotes ? "page" : undefined}
            className={`relative ${iconButton(onNotes)}`}
          >
            <NoteIcon />
            {unreadNotes > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium leading-[16px] text-white">
                {unreadNotes > 9 ? "9+" : unreadNotes}
              </span>
            )}
          </Link>

          <Link
            href="/einstellungen"
            title={t.nav.settings}
            aria-label={t.nav.settings}
            aria-current={onSettings ? "page" : undefined}
            className={iconButton(onSettings)}
          >
            <GearIcon />
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              title={t.nav.signOut}
              aria-label={t.nav.signOut}
              className={iconButton(false)}
            >
              <SignOutIcon />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
