import type { Locale } from "./i18n/dictionaries";
import { parseDate } from "./rent";

/**
 * Zahlen- und Datumsformat richten sich nach der gewählten Sprache:
 * 1.250,50 € und 31.12.2026 im Deutschen, €1,250.50 und 31/12/2026 im
 * Englischen. Die Währung bleibt in beiden Fällen der Euro.
 */
const INTL_LOCALE: Record<Locale, string> = {
  de: "de-DE",
  en: "en-GB",
};

const euroCache = new Map<Locale, Intl.NumberFormat>();
const dateCache = new Map<Locale, Intl.DateTimeFormat>();

export function formatEuro(value: number, locale: Locale = "de"): string {
  let formatter = euroCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: "EUR",
    });
    euroCache.set(locale, formatter);
  }
  return formatter.format(value);
}

export function formatDate(value: string | Date, locale: Locale = "de"): string {
  let formatter = dateCache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    dateCache.set(locale, formatter);
  }
  return formatter.format(typeof value === "string" ? parseDate(value) : value);
}

export function formatDateTime(value: string | Date, locale: Locale = "de"): string {
  return new Date(value).toLocaleString(INTL_LOCALE[locale]);
}

/** Gebündelte Formatierer, damit Komponenten die Sprache nicht durchreichen müssen. */
/**
 * Anteil als Prozentwert. Zwei Nachkommastellen, weil bei Renditen der
 * Unterschied zwischen 3,4 % und 3,45 % über Jahrzehnte spürbar ist.
 */
export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatters(locale: Locale) {
  return {
    euro: (value: number) => formatEuro(value, locale),
    percent: (value: number) => formatPercent(value, locale),
    date: (value: string | Date) => formatDate(value, locale),
    dateTime: (value: string | Date) => formatDateTime(value, locale),
  };
}

export type Formatters = ReturnType<typeof formatters>;
