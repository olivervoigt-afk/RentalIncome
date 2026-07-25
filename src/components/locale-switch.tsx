"use client";

import { useRef } from "react";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";

/** Umschalter DE/EN. Die Wahl wird im Konto gespeichert, nicht nur im Browser. */
export default function LocaleSwitch({ locale }: { locale: Locale }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setLocale} className="flex rounded-md border border-border p-0.5">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          aria-current={code === locale ? "true" : undefined}
          className={`rounded px-2 py-1 text-xs font-medium uppercase transition-colors ${
            code === locale
              ? "bg-surface-muted text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {code}
        </button>
      ))}
    </form>
  );
}
