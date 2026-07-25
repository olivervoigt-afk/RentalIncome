"use client";

import { FlagDE, FlagUK } from "@/components/flags";
import { setLocale } from "@/lib/actions/locale";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/dictionaries";

const FLAGS = { de: FlagDE, en: FlagUK } as const;

/** Sprachwahl über Flaggen. Die Wahl wird im Konto gespeichert, nicht im Browser. */
export default function LocaleSwitch({ locale }: { locale: Locale }) {
  return (
    <form action={setLocale} className="flex items-center gap-1">
      {LOCALES.map((code) => {
        const Flag = FLAGS[code];
        const active = code === locale;

        return (
          <button
            key={code}
            type="submit"
            name="locale"
            value={code}
            title={LOCALE_LABELS[code]}
            aria-label={LOCALE_LABELS[code]}
            aria-current={active ? "true" : undefined}
            className={`rounded-[4px] p-0.5 transition-all ${
              active
                ? "opacity-100"
                : "opacity-40 grayscale hover:opacity-80 hover:grayscale-0"
            }`}
          >
            <Flag title={LOCALE_LABELS[code]} />
          </button>
        );
      })}
    </form>
  );
}
