"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PaymentFrequency } from "@/lib/types";

export type ImportRow = {
  name: string;
  location: string;
  tenant_name: string;
  start_date: string;
  term_months: string;
  payment_frequency: string;
  amount: string;
  ta24: string;
};

export type ImportResult = {
  error?: string;
  imported?: number;
  skipped?: { row: number; name: string; reason: string }[];
};

/** Akzeptiert "31.12.2024", "2024-12-31" und "31/12/2024". */
function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (!match) return null;

  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Akzeptiert "1.250,50", "1250.50" und "1 250". */
function parseAmount(raw: string): number | null {
  const value = raw.replace(/[^\d,.\-]/g, "").trim();
  if (!value) return null;

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseFrequency(raw: string): PaymentFrequency {
  const value = raw.trim().toLowerCase();
  if (/quart|vierteljähr|3/.test(value)) return "quarterly";
  if (/jähr|jahr|annual|year|12/.test(value)) return "yearly";
  return "monthly";
}

function parseBoolean(raw: string): boolean {
  return /^(ja|j|yes|y|true|wahr|1|x)$/i.test(raw.trim());
}

export async function importProperties(rows: ImportRow[]): Promise<ImportResult> {
  await requireEditor();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Keine Datenzeilen übergeben." };
  }
  if (rows.length > 500) {
    return { error: "Maximal 500 Zeilen pro Import." };
  }

  const supabase = await createClient();
  const skipped: NonNullable<ImportResult["skipped"]> = [];
  let imported = 0;

  for (const [index, row] of rows.entries()) {
    const name = (row.name ?? "").trim();
    const line = index + 2; // +1 für Kopfzeile, +1 für 1-basierte Zählung

    if (!name) {
      skipped.push({ row: line, name: "—", reason: "Kein Objektname" });
      continue;
    }

    const start_date = parseDate(row.start_date ?? "");
    if (!start_date) {
      skipped.push({ row: line, name, reason: "Mietbeginn fehlt oder unlesbar" });
      continue;
    }

    const term = Number((row.term_months ?? "").replace(/[^\d]/g, ""));
    if (!Number.isInteger(term) || term < 1) {
      skipped.push({ row: line, name, reason: "Laufzeit fehlt oder ungültig" });
      continue;
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({
        name,
        location: (row.location ?? "").trim(),
        tenant_name: (row.tenant_name ?? "").trim(),
        start_date,
        term_months: term,
        payment_frequency: parseFrequency(row.payment_frequency ?? ""),
        ta24: parseBoolean(row.ta24 ?? ""),
        notes: "",
      })
      .select("id")
      .single();

    if (error) {
      skipped.push({ row: line, name, reason: error.message });
      continue;
    }

    const amount = parseAmount(row.amount ?? "");
    if (amount !== null && amount > 0) {
      await supabase.from("rent_periods").insert({
        property_id: data.id,
        valid_from: start_date,
        valid_to: null,
        amount,
      });
    }

    imported++;
  }

  revalidatePath("/");
  revalidatePath("/objekte");
  return { imported, skipped };
}
