"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireEditor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import type { ActionState } from "./auth";

const ROLES: UserRole[] = ["admin", "editor", "viewer"];

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const email = text(formData, "email").toLowerCase();
  const full_name = text(formData, "full_name");
  const password = text(formData, "password");
  const role = text(formData, "role") as UserRole;

  if (!email || !full_name) {
    return { error: "Bitte Name und E-Mail-Adresse angeben." };
  }
  if (password.length < 8) {
    return { error: "Das Basispasswort muss mindestens 8 Zeichen lang sein." };
  }
  if (!ROLES.includes(role)) return { error: "Ungültige Rolle." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) {
    return {
      error: error.message.includes("already")
        ? "Für diese E-Mail-Adresse besteht bereits ein Konto."
        : error.message,
    };
  }

  // Der Trigger legt das Profil an; Name und Rolle hier absichern.
  await admin.from("profiles").update({ full_name, role }).eq("id", data.user.id);

  revalidatePath("/benutzer");
  return { success: `${full_name} wurde angelegt.` };
}

export async function updateUserRole(formData: FormData) {
  const me = await requireAdmin();

  const id = text(formData, "id");
  const role = text(formData, "role") as UserRole;
  if (!ROLES.includes(role)) return;

  // Verhindert, dass sich der letzte Administrator selbst herabstuft.
  if (id === me.id && role !== "admin") {
    const admin = createAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) return;
  }

  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", id);
  await admin.auth.admin.updateUserById(id, { user_metadata: { role } });

  revalidatePath("/benutzer");
}

export async function resetUserPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, "id");
  const password = text(formData, "password");

  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) return { error: error.message };
  return { success: "Passwort wurde neu gesetzt." };
}

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();

  const id = text(formData, "id");
  if (id === me.id) return; // Eigenes Konto nicht löschbar.

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);

  revalidatePath("/benutzer");
}

/* ---------------- Zahlungsquellen ---------------- */

export async function addPaymentSource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();

  const name = text(formData, "name");
  if (!name) return { error: "Bitte eine Bezeichnung angeben." };

  const supabase = await createClient();
  const { error } = await supabase.from("payment_sources").insert({ name });

  if (error) {
    return {
      error: error.code === "23505"
        ? "Diese Zahlungsquelle existiert bereits."
        : error.message,
    };
  }

  revalidatePath("/einstellungen");
  return { success: `„${name}" wurde hinzugefügt.` };
}

export async function deletePaymentSource(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const supabase = await createClient();
  await supabase.from("payment_sources").delete().eq("id", id);

  revalidatePath("/einstellungen");
}

/* ---------------- Standorte ---------------- */

export async function addLocation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();

  const name = text(formData, "name");
  if (!name) return { error: "Bitte eine Bezeichnung angeben." };

  const supabase = await createClient();
  const { error } = await supabase.from("locations").insert({ name, sort_order: 10 });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Diesen Standort gibt es bereits."
          : error.message,
    };
  }

  revalidatePath("/einstellungen");
  revalidatePath("/");
  return { success: `„${name}" wurde hinzugefügt.` };
}

export async function deleteLocation(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const supabase = await createClient();
  // Objekte behalten ihren Eintrag; die Zuordnung wird per ON DELETE SET NULL gelöst.
  await supabase.from("locations").delete().eq("id", id);

  revalidatePath("/einstellungen");
  revalidatePath("/");
}
