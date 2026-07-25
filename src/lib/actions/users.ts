"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireEditor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import type { ActionState } from "./auth";
import { fill, plural } from "@/lib/i18n/dictionaries";

const ROLES: UserRole[] = ["admin", "editor", "viewer"];

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const { t } = await getDict();

  const email = text(formData, "email").toLowerCase();
  const full_name = text(formData, "full_name");
  const password = text(formData, "password");
  const role = text(formData, "role") as UserRole;

  if (!email || !full_name) {
    return { error: t.actions.needNameEmail };
  }
  if (password.length < 8) {
    return { error: t.actions.basePasswordTooShort };
  }
  if (!ROLES.includes(role)) return { error: t.actions.badRole };

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
        ? t.actions.emailExists
        : error.message,
    };
  }

  // Der Trigger legt das Profil an; Name und Rolle hier absichern.
  await admin.from("profiles").update({ full_name, role }).eq("id", data.user.id);

  revalidatePath("/benutzer");
  return { success: fill(t.actions.userCreated, { name: full_name }) };
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
  const { t } = await getDict();

  const id = text(formData, "id");
  const password = text(formData, "password");

  if (password.length < 8) {
    return { error: t.actions.passwordTooShort };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) return { error: error.message };
  return { success: t.actions.passwordReset };
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
  const { t } = await getDict();

  const name = text(formData, "name");
  if (!name) return { error: t.actions.needLabel };

  const supabase = await createClient();
  const { error } = await supabase.from("payment_sources").insert({ name });

  if (error) {
    return {
      error: error.code === "23505"
        ? t.actions.sourceExists
        : error.message,
    };
  }

  revalidatePath("/einstellungen");
  return { success: fill(t.actions.added, { name }) };
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
  const { t } = await getDict();

  const name = text(formData, "name");
  if (!name) return { error: t.actions.needLabel };

  const supabase = await createClient();
  const { error } = await supabase.from("locations").insert({ name, sort_order: 10 });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? t.actions.locationExists
          : error.message,
    };
  }

  revalidatePath("/einstellungen");
  revalidatePath("/");
  return { success: fill(t.actions.added, { name }) };
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
