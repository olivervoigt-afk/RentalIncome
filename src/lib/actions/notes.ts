"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./auth";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Legt eine Notiz an. Ohne Empfänger ist sie eine Aktennotiz für alle,
 * mit Empfänger nur für Absender und Empfänger sichtbar — durchgesetzt
 * von der Datenbank, nicht von der Oberfläche.
 */
export async function addNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const { t } = await getDict();

  const property_id = text(formData, "property_id");
  const body = text(formData, "body");
  const recipient_id = text(formData, "recipient_id") || null;
  const parent_id = text(formData, "parent_id") || null;

  if (!body) return { error: t.notes.needBody };

  const supabase = await createClient();
  const { error } = await supabase.from("property_notes").insert({
    property_id,
    author_id: profile.id,
    recipient_id: recipient_id === profile.id ? null : recipient_id,
    parent_id,
    body,
  });

  if (error) return { error: error.message };

  revalidatePath(`/objekte/${property_id}`);
  revalidatePath("/notizen");
  revalidatePath("/", "layout");
  return { success: t.notes.saved };
}

/** Markiert die übergebenen Notizen als gelesen. Wirkt nur beim Empfänger. */
export async function markNotesRead(ids: string[]): Promise<void> {
  const profile = await requireProfile();
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase
    .from("property_notes")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("recipient_id", profile.id)
    .is("read_at", null);

  revalidatePath("/notizen");
  revalidatePath("/", "layout");
}

export async function deleteNote(formData: FormData) {
  const profile = await requireProfile();

  const id = text(formData, "id");
  const property_id = text(formData, "property_id");

  const supabase = await createClient();
  await supabase
    .from("property_notes")
    .delete()
    .eq("id", id)
    .eq("author_id", profile.id);

  revalidatePath(`/objekte/${property_id}`);
  revalidatePath("/notizen");
  revalidatePath("/", "layout");
}
