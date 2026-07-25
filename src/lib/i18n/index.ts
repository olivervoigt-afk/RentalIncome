import { getProfile } from "@/lib/auth";
import { dictionaries, isLocale, type Dict, type Locale } from "./dictionaries";

export { LOCALES, LOCALE_LABELS, isLocale } from "./dictionaries";
export type { Dict, Locale } from "./dictionaries";

/** Sprache des angemeldeten Benutzers; ohne Anmeldung Deutsch. */
export async function getLocale(): Promise<Locale> {
  const profile = await getProfile();
  return isLocale(profile?.locale) ? profile.locale : "de";
}

export function getDictFor(locale: Locale): Dict {
  return dictionaries[locale];
}

/** Wörterbuch und Sprache für Server Components. */
export async function getDict(): Promise<{ t: Dict; locale: Locale }> {
  const locale = await getLocale();
  return { t: dictionaries[locale], locale };
}
