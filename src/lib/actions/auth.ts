"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: string };

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("weiter") ?? "/") || "/";

  const { t } = await getDict();

  if (!email || !password) {
    return { error: t.login.missing };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t.login.wrong };
  }

  // Nur interne Ziele zulassen, damit die Rücksprung-URL nicht
  // auf eine fremde Seite umgeleitet werden kann.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();
  const { t } = await getDict();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: t.actions.passwordTooShort };
  }
  if (password !== confirm) {
    return { error: t.actions.passwordMismatch };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  revalidatePath("/einstellungen");
  return { success: t.actions.passwordChanged };
}
