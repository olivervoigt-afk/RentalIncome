import { getProfile } from "./auth";
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
  PropertyNote,
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

export type Ta24Row = {
  propertyId: string;
  name: string;
  location: string | null;
  archived: boolean;
  /** Je Kalenderjahr: Anzahl und Summe der Eingänge sowie steuerliche Minderungen. */
  byYear: Map<number, Ta24Cell>;
  total: number;
};

export type Ta24Cell = {
  count: number;
  /** Tatsächlich eingegangene Zahlungen. */
  sum: number;
  /** Gutschriften, die als steuermindernd gekennzeichnet sind. */
  reductions: number;
  /** sum − reductions. */
  taxable: number;
};

export type Ta24Report = {
  years: number[];
  rows: Ta24Row[];
  /** Summe aller Objekte je Jahr. */
  totalsByYear: Map<number, Ta24Cell>;
  grandTotal: number;
  /** true, sobald irgendwo eine steuermindernde Gutschrift vorliegt. */
  hasReductions: boolean;
};

/**
 * Auswertung für die maltesische Steuererklärung.
 *
 * Maßgeblich ist das **Zahlungsdatum**, nicht die Fälligkeit: eine im Januar
 * eingegangene Dezembermiete zählt ins Januar-Jahr (Ist-Prinzip). Archivierte
 * Objekte bleiben enthalten, da ihre Zahlungen zu vergangenen Jahren gehören.
 *
 * Gutschriften zählen nur, wenn sie ausdrücklich als steuermindernd
 * gekennzeichnet sind — etwa bei einer Erstattung bereits erhaltener Miete.
 * Eine von vornherein erlassene Miete erscheint ohnehin nicht als Eingang.
 */
export async function getTa24Report(): Promise<Ta24Report> {
  const supabase = await createClient();

  const [propertiesResult, locationsResult, payments, credits] = await Promise.all([
    supabase.from("properties").select("*").eq("ta24", true).order("name"),
    supabase.from("locations").select("*"),
    fetchAll<Payment>(supabase, "payments"),
    fetchAll<Credit>(supabase, "credits"),
  ]);

  if (propertiesResult.error) throw propertiesResult.error;

  const properties = (propertiesResult.data ?? []) as Property[];
  const locationName = new Map(
    ((locationsResult.data ?? []) as Location[]).map((l) => [l.id, l.name]),
  );
  const relevant = new Set(properties.map((p) => p.id));
  const byProperty = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!relevant.has(payment.property_id)) continue;
    byProperty.set(payment.property_id, [
      ...(byProperty.get(payment.property_id) ?? []),
      payment,
    ]);
  }

  const creditsByProperty = new Map<string, Credit[]>();
  let hasReductions = false;

  for (const credit of credits) {
    if (!relevant.has(credit.property_id) || !credit.reduces_ta24) continue;
    hasReductions = true;
    creditsByProperty.set(credit.property_id, [
      ...(creditsByProperty.get(credit.property_id) ?? []),
      credit,
    ]);
  }

  const emptyCell = (): Ta24Cell => ({ count: 0, sum: 0, reductions: 0, taxable: 0 });

  const years = new Set<number>();
  const totalsByYear = new Map<number, Ta24Cell>();
  let grandTotal = 0;

  const rows: Ta24Row[] = properties.map((property) => {
    const byYear = new Map<number, Ta24Cell>();
    let total = 0;

    for (const payment of byProperty.get(property.id) ?? []) {
      const year = Number(payment.paid_on.slice(0, 4));
      const amount = Number(payment.amount);

      years.add(year);

      const cell = byYear.get(year) ?? emptyCell();
      cell.count += 1;
      cell.sum += amount;
      byYear.set(year, cell);

      const overall = totalsByYear.get(year) ?? emptyCell();
      overall.count += 1;
      overall.sum += amount;
      totalsByYear.set(year, overall);
    }

    // Steuermindernde Gutschriften im Jahr ihrer Erfassung abziehen.
    for (const credit of creditsByProperty.get(property.id) ?? []) {
      const year = Number(credit.credited_on.slice(0, 4));
      const amount = Number(credit.amount);

      years.add(year);

      const cell = byYear.get(year) ?? emptyCell();
      cell.reductions += amount;
      byYear.set(year, cell);

      const overall = totalsByYear.get(year) ?? emptyCell();
      overall.reductions += amount;
      totalsByYear.set(year, overall);
    }

    for (const cell of byYear.values()) {
      cell.taxable = cell.sum - cell.reductions;
      total += cell.taxable;
    }
    grandTotal += total;

    return {
      propertyId: property.id,
      name: property.name,
      location: property.location_id
        ? (locationName.get(property.location_id) ?? null)
        : null,
      archived: property.archived,
      byYear,
      total,
    };
  });

  for (const cell of totalsByYear.values()) {
    cell.taxable = cell.sum - cell.reductions;
  }

  return {
    years: [...years].sort((a, b) => b - a),
    rows,
    totalsByYear,
    grandTotal,
    hasReductions,
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


export type IncomeRow = {
  propertyId: string;
  name: string;
  location: string | null;
  archived: boolean;
  tenant: string;
  byYear: Map<number, Ta24Cell>;
};

export type IncomeReport = {
  years: number[];
  /** Vorkommende Standorte, "ohne" steht für Objekte ohne Zuordnung. */
  locations: string[];
  rows: IncomeRow[];
  hasReductions: boolean;
};

/**
 * Jahreseinnahmen je Standort — das Gegenstück zur TA24-Auswertung für
 * Finanzämter ausserhalb Maltas.
 *
 * Wie dort gilt das Ist-Prinzip: gezählt wird, was im jeweiligen Kalenderjahr
 * tatsächlich geflossen ist. Als steuermindernd gekennzeichnete Gutschriften
 * werden abgezogen. Archivierte Objekte bleiben enthalten, da ihre Zahlungen
 * zu vergangenen Jahren gehören.
 */
export async function getAnnualIncome(): Promise<IncomeReport> {
  const supabase = await createClient();

  const [propertiesResult, locationsResult, payments, credits] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase.from("locations").select("*"),
    fetchAll<Payment>(supabase, "payments"),
    fetchAll<Credit>(supabase, "credits"),
  ]);

  if (propertiesResult.error) throw propertiesResult.error;

  const properties = (propertiesResult.data ?? []) as Property[];
  const locationName = new Map(
    ((locationsResult.data ?? []) as Location[]).map((l) => [l.id, l.name]),
  );

  const byPayment = groupBy(payments);
  const byCredit = groupBy(credits);
  const years = new Set<number>();
  const locations = new Set<string>();
  let hasReductions = false;

  const rows: IncomeRow[] = properties.map((property) => {
    const location = property.location_id
      ? (locationName.get(property.location_id) ?? null)
      : null;
    if (location) locations.add(location);

    const byYear = new Map<number, Ta24Cell>();

    for (const payment of byPayment.get(property.id) ?? []) {
      const year = Number(payment.paid_on.slice(0, 4));
      years.add(year);

      const cell =
        byYear.get(year) ?? { count: 0, sum: 0, reductions: 0, taxable: 0 };
      cell.count += 1;
      cell.sum += Number(payment.amount);
      byYear.set(year, cell);
    }

    for (const credit of byCredit.get(property.id) ?? []) {
      if (!credit.reduces_ta24) continue;
      hasReductions = true;

      const year = Number(credit.credited_on.slice(0, 4));
      years.add(year);

      const cell =
        byYear.get(year) ?? { count: 0, sum: 0, reductions: 0, taxable: 0 };
      cell.reductions += Number(credit.amount);
      byYear.set(year, cell);
    }

    for (const cell of byYear.values()) cell.taxable = cell.sum - cell.reductions;

    return {
      propertyId: property.id,
      name: property.name,
      location,
      archived: property.archived,
      tenant: property.tenant_name,
      byYear,
    };
  });

  return {
    years: [...years].sort((a, b) => b - a),
    locations: [...locations].sort((a, b) => a.localeCompare(b, "de")),
    rows,
    hasReductions,
  };
}


export type NoteWithNames = PropertyNote & {
  authorName: string;
  recipientName: string | null;
};

/** Notizen eines Objekts. Die Sichtbarkeit regelt die Datenbank. */
export async function getPropertyNotes(propertyId: string): Promise<NoteWithNames[]> {
  const supabase = await createClient();

  const [notes, profiles] = await Promise.all([
    supabase
      .from("property_notes")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const nameOf = new Map(
    ((profiles.data ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]),
  );

  return ((notes.data ?? []) as PropertyNote[]).map((note) => ({
    ...note,
    authorName: nameOf.get(note.author_id) ?? "—",
    recipientName: note.recipient_id ? (nameOf.get(note.recipient_id) ?? "—") : null,
  }));
}

export type InboxNote = NoteWithNames & { propertyName: string };

export type Inbox = {
  unread: InboxNote[];
  recent: InboxNote[];
};

/**
 * Notizen über alle Objekte hinweg — ungelesene zuerst.
 * Was der Benutzer nicht sehen darf, filtert bereits die Datenbank heraus.
 */
export async function getInbox(): Promise<Inbox> {
  const supabase = await createClient();
  const profile = await getProfile();

  const [notes, profiles, properties] = await Promise.all([
    supabase
      .from("property_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("properties").select("id, name"),
  ]);

  const nameOf = new Map(
    ((profiles.data ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]),
  );
  const propertyName = new Map(
    ((properties.data ?? []) as Pick<Property, "id" | "name">[]).map((p) => [p.id, p.name]),
  );

  const all: InboxNote[] = ((notes.data ?? []) as PropertyNote[]).map((note) => ({
    ...note,
    authorName: nameOf.get(note.author_id) ?? "—",
    recipientName: note.recipient_id ? (nameOf.get(note.recipient_id) ?? "—") : null,
    propertyName: propertyName.get(note.property_id) ?? "—",
  }));

  const isMine = (n: InboxNote) => n.recipient_id === profile?.id && n.read_at === null;

  return {
    unread: all.filter(isMine),
    recent: all.filter((n) => !isMine(n)).slice(0, 30),
  };
}

/** Anzahl ungelesener Notizen für die Menüzeile. */
export async function getUnreadNoteCount(): Promise<number> {
  const profile = await getProfile();
  if (!profile) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("property_notes")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .is("read_at", null);

  return count ?? 0;
}
