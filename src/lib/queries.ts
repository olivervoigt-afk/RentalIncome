import { createClient } from "./supabase/server";
import { summarize, type PropertySummary } from "./rent";
import type {
  ContractHistoryEntry,
  Credit,
  Location,
  Payment,
  PaymentSource,
  Profile,
  Property,
  PropertyDocument,
  RentPeriod,
} from "./types";

export type PropertyWithSummary = Property & {
  summary: PropertySummary;
  /** Aufgelöster Standortname, null wenn keiner hinterlegt ist. */
  location: string | null;
};

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Holt eine Tabelle vollständig. Die Schnittstelle liefert je Anfrage
 * höchstens 1000 Zeilen — ohne Blättern fehlten bei mehreren tausend
 * Zahlungen stillschweigend Beträge in den Summen.
 */
async function fetchAll<T>(supabase: Client, table: string): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + size - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < size) return rows;
  }
}

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

  const [properties, periods, payments, credits, locations] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    fetchAll<RentPeriod>(supabase, "rent_periods"),
    fetchAll<Payment>(supabase, "payments"),
    fetchAll<Credit>(supabase, "credits"),
    supabase.from("locations").select("*"),
  ]);

  if (properties.error) throw properties.error;

  const byPeriod = groupBy(periods);
  const byPayment = groupBy(payments);
  const byCredit = groupBy(credits);
  const locationName = new Map(
    ((locations.data ?? []) as Location[]).map((l) => [l.id, l.name]),
  );
  const now = new Date();

  return (properties.data as Property[]).map((property) => ({
    ...property,
    location: property.location_id
      ? (locationName.get(property.location_id) ?? null)
      : null,
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
  /** Aufgelöster Standortname, null wenn keiner hinterlegt ist. */
  location: string | null;
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

  const typedProperty = property as Property;

  const locationRow = typedProperty.location_id
    ? await supabase
        .from("locations")
        .select("name")
        .eq("id", typedProperty.location_id)
        .maybeSingle()
    : null;

  const [periods, payments, credits, documents, history] = await Promise.all([
    supabase.from("rent_periods").select("*").eq("property_id", id).order("valid_from"),
    supabase.from("payments").select("*").eq("property_id", id).order("paid_on", { ascending: false }),
    supabase.from("credits").select("*").eq("property_id", id).order("credited_on", { ascending: false }),
    supabase.from("property_documents").select("*").eq("property_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("contract_history").select("*").eq("property_id", id).order("changed_at", { ascending: false }),
  ]);

  const typed = typedProperty;
  const periodRows = (periods.data ?? []) as RentPeriod[];
  const paymentRows = (payments.data ?? []) as Payment[];
  const creditRows = (credits.data ?? []) as Credit[];

  return {
    property: typed,
    location: (locationRow?.data as { name: string } | null)?.name ?? null,
    periods: periodRows,
    payments: paymentRows,
    credits: creditRows,
    documents: (documents.data ?? []) as PropertyDocument[],
    history: (history.data ?? []) as ContractHistoryEntry[],
    summary: summarize(typed, periodRows, paymentRows, creditRows),
  };
}

export async function getLocations(): Promise<Location[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .order("sort_order")
    .order("name");
  return (data ?? []) as Location[];
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
