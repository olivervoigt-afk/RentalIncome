"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { DepositKind } from "@/lib/types";
import type { ActionState } from "./auth";

const KINDS: DepositKind[] = ["received", "refunded", "retained"];

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

/**
 * Erfasst eine Kautionsbewegung.
 *
 * Ein Einbehalt kann gegen einen Mietrückstand verrechnet werden. Dann
 * entsteht zusätzlich eine echte Zahlung, denn der Mieter hat die Miete
 * damit wirtschaftlich beglichen — Saldo und Steuerauswertung greifen dann
 * von selbst. Ohne Verrechnung (etwa bei Schäden) bleibt der Betrag außerhalb
 * des Saldos und wird nur steuerlich berücksichtigt.
 */
export async function addDeposit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireEditor();
  const { t } = await getDict();

  const property_id = text(formData, "property_id");
  const kind = text(formData, "kind") as DepositKind;
  const happened_on = text(formData, "happened_on");
  const amount = number(formData, "amount");
  const note = text(formData, "note");
  const source_id = text(formData, "source_id") || null;
  const againstRent = formData.get("against_rent") === "on";

  if (!KINDS.includes(kind)) return { error: t.actions.badKind };
  if (!happened_on) return { error: t.actions.needDate };
  if (!Number.isFinite(amount) || amount <= 0) return { error: t.actions.needAmount };

  const supabase = await createClient();
  let payment_id: string | null = null;

  if (kind === "retained" && againstRent) {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        property_id,
        paid_on: happened_on,
        amount,
        source_id,
        note: note ? `${t.deposits.fromDeposit} — ${note}` : t.deposits.fromDeposit,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    payment_id = data.id;
  }

  const { error } = await supabase.from("deposits").insert({
    property_id,
    kind,
    happened_on,
    amount,
    source_id,
    note,
    payment_id,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  revalidatePath("/auswertungen");
  return { success: t.deposits.saved };
}

export async function deleteDeposit(formData: FormData) {
  await requireEditor();

  const id = text(formData, "id");
  const property_id = text(formData, "property_id");

  const supabase = await createClient();

  // Eine mitgebuchte Zahlung muss mit verschwinden, sonst bliebe sie als
  // Einnahme ohne Gegenstück stehen.
  const { data } = await supabase
    .from("deposits")
    .select("payment_id")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("deposits").delete().eq("id", id);

  if (data?.payment_id) {
    await supabase.from("payments").delete().eq("id", data.payment_id);
  }

  revalidatePath("/");
  revalidatePath(`/objekte/${property_id}`);
  revalidatePath("/auswertungen");
}
