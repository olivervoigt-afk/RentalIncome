"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./auth";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Leeres Feld bleibt leer — 0 und "nicht erfasst" sind nicht dasselbe. */
function amount(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function date(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

function read(formData: FormData) {
  return {
    name: text(formData, "name"),
    location_id: text(formData, "location_id") || null,
    purchased_on: date(formData, "purchased_on"),
    purchase_price: amount(formData, "purchase_price"),
    costs_percent: amount(formData, "costs_percent"),
    costs_amount: amount(formData, "costs_amount"),
    annual_costs: amount(formData, "annual_costs"),
    market_rent: amount(formData, "market_rent"),
    valuation: amount(formData, "valuation"),
    valued_on: date(formData, "valued_on"),
    opening_value: amount(formData, "opening_value"),
    sold_on: date(formData, "sold_on"),
    sale_price: amount(formData, "sale_price"),
    notes: text(formData, "notes"),
  };
}

type Messages = Awaited<ReturnType<typeof getDict>>["t"]["actions"];

function check(input: ReturnType<typeof read>, m: Messages): string | null {
  if (!input.name) return m.needName;
  // Ein Verkauf ohne Preis liesse sich nicht abschliessen; die Datenbank
  // lehnte es ohnehin ab, hier kommt die verständliche Meldung.
  if (input.sold_on && input.sale_price === null) return m.needSalePrice;
  if (input.valuation !== null && !input.valued_on) return m.needValuationDate;
  return null;
}

export async function createInvestment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireEditor();
  const { t } = await getDict();

  const input = read(formData);
  const problem = check(input, t.actions);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .insert({ ...input, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/rendite");
  redirect(`/rendite/${data.id}`);
}

export async function updateInvestment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireEditor();
  const { t } = await getDict();

  const id = text(formData, "id");
  const input = read(formData);
  const problem = check(input, t.actions);
  if (problem) return { error: problem };

  const supabase = await createClient();
  // Ohne select() meldet die Datenbank auch dann Erfolg, wenn keine Zeile
  // betroffen war — etwa weil die Rechte fehlen.
  const { data, error } = await supabase
    .from("investments")
    .update(input)
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: t.actions.nothingSaved };

  revalidatePath("/rendite");
  revalidatePath(`/rendite/${id}`);
  return { success: t.actions.saved };
}

export async function deleteInvestment(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const supabase = await createClient();

  // Die Mietverhältnisse bleiben bestehen, sie verlieren nur die Zuordnung.
  await supabase.from("properties").update({ investment_id: null }).eq("investment_id", id);
  await supabase.from("investments").delete().eq("id", id);

  revalidatePath("/rendite");
  redirect("/rendite");
}

/* ---------------- Nachträgliche Investitionen ---------------- */

export async function addExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireEditor();
  const { t } = await getDict();

  const investment_id = text(formData, "investment_id");
  const happened_on = text(formData, "happened_on");
  const value = amount(formData, "amount");

  if (!happened_on) return { error: t.actions.needDate };
  if (value === null || value <= 0) return { error: t.actions.needAmount };

  const supabase = await createClient();
  const { error } = await supabase.from("investment_expenses").insert({
    investment_id,
    happened_on,
    amount: value,
    description: text(formData, "description"),
    value_adding: formData.get("value_adding") === "on",
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/rendite");
  revalidatePath(`/rendite/${investment_id}`);
  return { success: t.actions.saved };
}

export async function deleteExpense(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const investment_id = text(formData, "investment_id");

  const supabase = await createClient();
  await supabase.from("investment_expenses").delete().eq("id", id);

  revalidatePath("/rendite");
  revalidatePath(`/rendite/${investment_id}`);
}

/* ---------------- Zuordnung am Mietverhältnis ---------------- */

export async function assignInvestment(formData: FormData) {
  await requireEditor();

  const property_id = text(formData, "property_id");
  const investment_id = text(formData, "investment_id") || null;

  const supabase = await createClient();
  await supabase.from("properties").update({ investment_id }).eq("id", property_id);

  revalidatePath("/rendite");
  revalidatePath(`/objekte/${property_id}`);
}
