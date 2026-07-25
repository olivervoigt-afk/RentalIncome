"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PaymentFrequency } from "@/lib/types";
import type { ActionState } from "./auth";

const FREQUENCIES: PaymentFrequency[] = ["monthly", "quarterly", "yearly"];

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
  location: string;
  tenant_name: string;
  start_date: string;
  term_months: number;
  payment_frequency: PaymentFrequency;
  ta24: boolean;
  notes: string;
};

function readProperty(formData: FormData): PropertyInput | string {
  const name = text(formData, "name");
  const start_date = text(formData, "start_date");
  const term_months = Number(text(formData, "term_months"));
  const frequency = text(formData, "payment_frequency") as PaymentFrequency;

  if (!name) return "Bitte einen Objektnamen angeben.";
  if (!start_date) return "Bitte den Mietbeginn angeben.";
  if (!Number.isInteger(term_months) || term_months < 1) {
    return "Die Laufzeit muss eine ganze Zahl von mindestens 1 Monat sein.";
  }
  if (!FREQUENCIES.includes(frequency)) return "Ungültiger Zahlungsrhythmus.";

  return {
    name,
    location: text(formData, "location"),
    tenant_name: text(formData, "tenant_name"),
    start_date,
    term_months,
    payment_frequency: frequency,
    ta24: formData.get("ta24") === "on",
    notes: text(formData, "notes"),
  };
}

export async function createProperty(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();

  const input = readProperty(formData);
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
  revalidatePath("/objekte");
  redirect(`/objekte/${data.id}`);
}

export async function updateProperty(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();

  const id = text(formData, "id");
  const input = readProperty(formData);
  if (typeof input === "string") return { error: input };

  const supabase = await createClient();
  const { error } = await supabase.from("properties").update(input).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/objekte");
  revalidatePath(`/objekte/${id}`);
  return { success: "Änderungen gespeichert." };
}

export async function setArchived(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const archived = text(formData, "archived") === "1";

  const supabase = await createClient();
  await supabase.from("properties").update({ archived }).eq("id", id);

  revalidatePath("/");
  revalidatePath("/objekte");
  revalidatePath(`/objekte/${id}`);
}

export async function deleteProperty(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const supabase = await createClient();
  await supabase.from("properties").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath("/objekte");
  redirect("/objekte");
}

/* ---------------- Mietstaffel ---------------- */

export async function addRentPeriod(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();

  const property_id = text(formData, "property_id");
  const valid_from = text(formData, "valid_from");
  const valid_to = text(formData, "valid_to") || null;
  const amount = number(formData, "amount");

  if (!valid_from) return { error: "Bitte ein Startdatum angeben." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Bitte einen gültigen Mietbetrag angeben." };
  }
  if (valid_to && valid_to < valid_from) {
    return { error: "Das Enddatum liegt vor dem Startdatum." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rent_periods")
    .insert({ property_id, valid_from, valid_to, amount });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  return { success: "Mietzeitraum hinzugefügt." };
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

  const property_id = text(formData, "property_id");
  const paid_on = text(formData, "paid_on");
  const amount = number(formData, "amount");
  const source_id = text(formData, "source_id") || null;

  if (!paid_on) return { error: "Bitte das Zahlungsdatum angeben." };
  if (!Number.isFinite(amount) || amount === 0) {
    return { error: "Bitte einen gültigen Betrag angeben." };
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
  return { success: "Zahlung erfasst." };
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

  const property_id = text(formData, "property_id");
  const credited_on = text(formData, "credited_on");
  const amount = number(formData, "amount");

  if (!credited_on) return { error: "Bitte das Datum angeben." };
  if (!Number.isFinite(amount) || amount === 0) {
    return { error: "Bitte einen gültigen Betrag angeben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("credits").insert({
    property_id,
    credited_on,
    amount,
    reason: text(formData, "reason"),
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  return { success: "Gutschrift erfasst." };
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

  const property_id = text(formData, "property_id");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Datei auswählen." };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { error: "Die Datei ist grösser als 20 MB." };
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
    storage_path,
    size_bytes: file.size,
    uploaded_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/objekte/${property_id}`);
  return { success: "Dokument hochgeladen." };
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
