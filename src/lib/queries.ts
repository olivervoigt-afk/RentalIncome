import { createClient } from "./supabase/server";
import { summarize, type PropertySummary } from "./rent";
import type {
  ContractHistoryEntry,
  Credit,
  Payment,
  PaymentSource,
  Profile,
  Property,
  PropertyDocument,
  RentPeriod,
} from "./types";

export type PropertyWithSummary = Property & { summary: PropertySummary };

function groupBy<T extends { property_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.property_id);
    if (list) list.push(row);
    else map.set(row.property_id, [row]);
  }
  return map;
}

/**
 * Alle Objekte inklusive berechnetem Saldo. Der Datenbestand ist klein genug,
 * um Staffeln, Zahlungen und Gutschriften in je einer Abfrage zu laden und
 * die Kennzahlen serverseitig zu berechnen.
 */
export async function getPropertiesWithSummary(): Promise<PropertyWithSummary[]> {
  const supabase = await createClient();

  const [properties, periods, payments, credits] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase.from("rent_periods").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("credits").select("*"),
  ]);

  if (properties.error) throw properties.error;

  const byPeriod = groupBy((periods.data ?? []) as RentPeriod[]);
  const byPayment = groupBy((payments.data ?? []) as Payment[]);
  const byCredit = groupBy((credits.data ?? []) as Credit[]);
  const now = new Date();

  return (properties.data as Property[]).map((property) => ({
    ...property,
    summary: summarize(
      property,
      byPeriod.get(property.id) ?? [],
      byPayment.get(property.id) ?? [],
      byCredit.get(property.id) ?? [],
      now,
    ),
  }));
}

export type PropertyDetail = {
  property: Property;
  periods: RentPeriod[];
  payments: Payment[];
  credits: Credit[];
  documents: PropertyDocument[];
  history: ContractHistoryEntry[];
  summary: PropertySummary;
};

export async function getPropertyDetail(
  id: string,
): Promise<PropertyDetail | null> {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) return null;

  const [periods, payments, credits, documents, history] = await Promise.all([
    supabase.from("rent_periods").select("*").eq("property_id", id).order("valid_from"),
    supabase.from("payments").select("*").eq("property_id", id).order("paid_on", { ascending: false }),
    supabase.from("credits").select("*").eq("property_id", id).order("credited_on", { ascending: false }),
    supabase.from("property_documents").select("*").eq("property_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("contract_history").select("*").eq("property_id", id).order("changed_at", { ascending: false }),
  ]);

  const typed = property as Property;
  const periodRows = (periods.data ?? []) as RentPeriod[];
  const paymentRows = (payments.data ?? []) as Payment[];
  const creditRows = (credits.data ?? []) as Credit[];

  return {
    property: typed,
    periods: periodRows,
    payments: paymentRows,
    credits: creditRows,
    documents: (documents.data ?? []) as PropertyDocument[],
    history: (history.data ?? []) as ContractHistoryEntry[],
    summary: summarize(typed, periodRows, paymentRows, creditRows),
  };
}

export async function getPaymentSources(): Promise<PaymentSource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_sources")
    .select("*")
    .order("sort_order")
    .order("name");
  return (data ?? []) as PaymentSource[];
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  return (data ?? []) as Profile[];
}
