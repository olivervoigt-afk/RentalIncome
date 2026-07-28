"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { PaymentFrequency } from "@/lib/types";
import type { ActionState } from "./auth";

const FREQUENCIES: PaymentFrequency[] = [
  "monthly",
  "quarterly",
  "semiannual",
  "yearly",
];

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function number(formData: FormData, key: string): number {
  // Deutsche Eingaben wie "1.250,50" ebenso akzeptieren wie "1250.50".
  const raw = text(formData, key).replace(/\s/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

type PropertyInput = {
  name: string;
  location_id: string | null;
  tenant_name: string;
  start_date: string;
  term_months: number;
  payment_frequency: PaymentFrequency;
  ta24: boolean;
  deposit_amount: number;
  notes: string;
};

type Messages = Awaited<ReturnType<typeof getDict>>["t"]["actions"];

function readProperty(formData: FormData, m: Messages): PropertyInput | string {
  const name = text(formData, "name");
  const start_date = text(formData, "start_date");
  const term_months = Number(text(formData, "term_months"));
  const frequency = text(formData, "payment_frequency") as PaymentFrequency;

  if (!name) return m.needName;
  if (!start_date) return m.needStart;
  if (!Number.isInteger(term_months) || term_months < 1) {
    return m.needTerm;
  }
  if (!FREQUENCIES.includes(frequency)) return m.badFrequency;

  // Kaution ist freiwillig; ein leeres Feld ergibt NaN und bedeutet "keine".
  const deposit = number(formData, "deposit_amount");
  if (text(formData, "deposit_amount") && (!Number.isFinite(deposit) || deposit < 0)) {
    return m.needAmount;
  }

  return {
    name,
    location_id: text(formData, "location_id") || null,
    tenant_name: text(formData, "tenant_name"),
    start_date,
    term_months,
    payment_frequency: frequency,
    ta24: formData.get("ta24") === "on",
    deposit_amount: deposit > 0 ? deposit : 0,
    notes: text(formData, "notes"),
  };
}

export async function createProperty(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();
  const { t } = await getDict();

  const input = readProperty(formData, t.actions);
  if (typeof input === "string") return { error: input };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert(input)
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Optionale erste Mietstaffel direkt aus dem Anlageformular übernehmen.
  const amount = number(formData, "amount");
  if (Number.isFinite(amount) && amount > 0) {
    await supabase.from("rent_periods").insert({
      property_id: data.id,
      valid_from: input.start_date,
      valid_to: null,
      amount,
    });
  }

  revalidatePath("/");

  redirect(`/objekte/${data.id}`);
}

export async function updateProperty(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();

  const { t } = await getDict();
  const id = text(formData, "id");
  const input = readProperty(formData, t.actions);
  if (typeof input === "string") return { error: input };

  const supabase = await createClient();
  // select() liefert die geänderten Zeilen zurück. Ohne diese Prüfung meldet
  // die Datenbank auch dann Erfolg, wenn gar keine Zeile betroffen war — etwa
  // weil das Objekt zwischenzeitlich gelöscht wurde oder die Rechte fehlen.
  const { data, error } = await supabase
    .from("properties")
    .update(input)
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) {
    return {
      error: t.actions.nothingSaved,
    };
  }

  revalidatePath("/");

  revalidatePath(`/objekte/${id}`);
  revalidatePath(`/objekte/${id}/bearbeiten`);
  return { success: t.actions.saved };
}

export async function setArchived(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const archived = text(formData, "archived") === "1";

  const supabase = await createClient();
  await supabase.from("properties").update({ archived }).eq("id", id);

  revalidatePath("/");

  revalidatePath(`/objekte/${id}`);
}

export async function deleteProperty(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const supabase = await createClient();
  await supabase.from("properties").delete().eq("id", id);

  revalidatePath("/");

  redirect("/");
}

/* ---------------- Mietstaffel ---------------- */

export async function addRentPeriod(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();
  const { t } = await getDict();

  const property_id = text(formData, "property_id");
  const valid_from = text(formData, "valid_from");
  const valid_to = text(formData, "valid_to") || null;
  const amount = number(formData, "amount");

  if (!valid_from) return { error: t.actions.needStartDate };
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: t.actions.needRent };
  }
  if (valid_to && valid_to < valid_from) {
    return { error: t.actions.endBeforeStart };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rent_periods")
    .insert({ property_id, valid_from, valid_to, amount });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  return { success: t.actions.periodAdded };
}

export async function deleteRentPeriod(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const property_id = text(formData, "property_id");

  const supabase = await createClient();
  await supabase.from("rent_periods").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
}

/* ---------------- Zahlungen ---------------- */

export async function addPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireEditor();
  const { t } = await getDict();

  const property_id = text(formData, "property_id");
  const paid_on = text(formData, "paid_on");
  const amount = number(formData, "amount");
  const source_id = text(formData, "source_id") || null;

  if (!paid_on) return { error: t.actions.needPaymentDate };
  if (!Number.isFinite(amount) || amount === 0) {
    return { error: t.actions.needAmount };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    property_id,
    paid_on,
    amount,
    source_id,
    note: text(formData, "note"),
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  return { success: t.actions.paymentAdded };
}

export async function deletePayment(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const property_id = text(formData, "property_id");

  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
}

/* ---------------- Gutschriften ---------------- */

export async function addCredit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireEditor();
  const { t } = await getDict();

  const property_id = text(formData, "property_id");
  const credited_on = text(formData, "credited_on");
  const amount = number(formData, "amount");

  if (!credited_on) return { error: t.actions.needDate };
  if (!Number.isFinite(amount) || amount === 0) {
    return { error: t.actions.needAmount };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("credits").insert({
    property_id,
    credited_on,
    amount,
    reason: text(formData, "reason"),
    reduces_ta24: formData.get("reduces_ta24") === "on",
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  return { success: t.actions.creditAdded };
}

export async function deleteCredit(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const property_id = text(formData, "property_id");

  const supabase = await createClient();
  await supabase.from("credits").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
}

/* ---------------- Dokumente ---------------- */

export async function uploadDocument(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireEditor();
  const { t } = await getDict();

  const property_id = text(formData, "property_id");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: t.actions.needFile };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { error: t.actions.fileTooBig };
  }

  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const storage_path = `${property_id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("property-documents")
    .upload(storage_path, file, { contentType: file.type || undefined });

  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("property_documents").insert({
    property_id,
    file_name: file.name,
    note: text(formData, "note"),
    storage_path,
    size_bytes: file.size,
    uploaded_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/objekte/${property_id}`);
  return { success: t.actions.uploaded };
}

export async function deleteDocument(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const property_id = text(formData, "property_id");
  const storage_path = text(formData, "storage_path");

  const supabase = await createClient();
  await supabase.storage.from("property-documents").remove([storage_path]);
  await supabase.from("property_documents").delete().eq("id", id);

  revalidatePath(`/objekte/${property_id}`);
}
