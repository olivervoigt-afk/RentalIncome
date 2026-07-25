"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/dictionaries";

/** Speichert die Sprachwahl im Benutzerkonto, damit sie auf jedem Gerät gilt. */
export async function setLocale(formData: FormData) {
  const profile = await requireProfile();
  const locale = String(formData.get("locale") ?? "");

  if (!isLocale(locale)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ locale }).eq("id", profile.id);

  revalidatePath("/", "layout");
}
