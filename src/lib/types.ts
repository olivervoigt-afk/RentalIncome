export type UserRole = "admin" | "editor" | "viewer";
export type PaymentFrequency = "monthly" | "quarterly" | "semiannual" | "yearly";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  editor: "Bearbeiter",
  viewer: "Leser",
};

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: "Monatlich",
  quarterly: "Quartalsweise",
  semiannual: "Halbjährlich",
  yearly: "Jährlich",
};

/** Monate zwischen zwei Fälligkeiten je Zahlungsrhythmus. */
export const FREQUENCY_MONTHS: Record<PaymentFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  locale: UserLocale;
  created_at: string;
};

export type PaymentSource = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
};

export type Location = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
};

export const NO_LOCATION = "Ohne Standort";

export type Property = {
  id: string;
  name: string;
  location_id: string | null;
  tenant_name: string;
  start_date: string;
  term_months: number;
  payment_frequency: PaymentFrequency;
  /**
   * Termin der ersten Rate nach einer Umstellung des Fälligkeitstags.
   * Sein Kalendertag ist zugleich der neue Fälligkeitstag.
   * null = nie umgestellt.
   */
  due_day_from: string | null;
  /** Zugehörige Investition; null, solange nicht zugeordnet. */
  investment_id: string | null;
  ta24: boolean;
  /** Vertraglich vereinbarte Kaution; 0 bedeutet "keine vereinbart". */
  deposit_amount: number;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Bewegung auf der Kaution. Bewusst getrennt von den Mietzahlungen —
 * eine verwahrte Kaution ist weder Einnahme noch Teil des Saldos.
 */
export type DepositKind = "received" | "refunded" | "retained";

export type Deposit = {
  id: string;
  property_id: string;
  kind: DepositKind;
  happened_on: string;
  /** Immer positiv; die Richtung steckt in kind. */
  amount: number;
  source_id: string | null;
  note: string;
  /**
   * Nur bei kind = "retained": Verweis auf die Zahlung, die aus dem
   * Einbehalt entstanden ist. Ist sie gesetzt, zählt bereits die Zahlung
   * in Saldo und Steuerauswertung.
   */
  payment_id: string | null;
  created_at: string;
  created_by: string | null;
};

/**
 * Die Ebene, auf der gekauft wurde. Ein Mietverhältnis gehört zu höchstens
 * einer Investition, eine Investition trägt beliebig viele Mietverhältnisse —
 * nacheinander bei Mieterwechsel, nebeneinander bei Paketkäufen.
 */
export type Investment = {
  id: string;
  name: string;
  location_id: string | null;
  purchased_on: string | null;
  purchase_price: number | null;
  /** Nebenkosten in Prozent des Kaufpreises. */
  costs_percent: number | null;
  /** Nebenkosten absolut; sticht den Prozentsatz. */
  costs_amount: number | null;
  /** Nicht umlagefähige Kosten pro Jahr, pauschal. */
  annual_costs: number | null;
  /** Ortsübliche Jahresmiete aller Einheiten; erlaubt den Vergleich. */
  market_rent: number | null;
  valuation: number | null;
  valued_on: string | null;
  /** Wert zu Beginn der Mieterfassung; leer = Gesamtinvest als Näherung. */
  opening_value: number | null;
  sold_on: string | null;
  sale_price: number | null;
  notes: string;
  created_at: string;
  created_by: string | null;
};

export type InvestmentExpense = {
  id: string;
  investment_id: string;
  happened_on: string;
  amount: number;
  description: string;
  /** Werterhöhend statt Instandhaltung — für den Steuerberater. */
  value_adding: boolean;
  created_at: string;
  created_by: string | null;
};

export type RentPeriod = {
  id: string;
  property_id: string;
  valid_from: string;
  valid_to: string | null;
  amount: number;
  created_at: string;
};

export type Payment = {
  id: string;
  property_id: string;
  paid_on: string;
  amount: number;
  source_id: string | null;
  note: string;
  created_at: string;
  created_by: string | null;
};

export type Credit = {
  id: string;
  property_id: string;
  credited_on: string;
  amount: number;
  reason: string;
  /** Mindert die steuerpflichtige Einnahme in der TA24-Auswertung. */
  reduces_ta24: boolean;
  created_at: string;
  created_by: string | null;
};

export type ContractHistoryEntry = {
  id: string;
  property_id: string;
  changed_at: string;
  changed_by: string | null;
  old_start_date: string | null;
  old_term_months: number | null;
  new_start_date: string | null;
  new_term_months: number | null;
};

export type PropertyDocument = {
  id: string;
  property_id: string;
  file_name: string;
  /** Freie Beschreibung, etwa "Nachtrag 2024" — kann leer bleiben. */
  note: string;
  storage_path: string;
  size_bytes: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
};

export type PropertyNote = {
  id: string;
  property_id: string;
  author_id: string;
  /** null = Aktennotiz für alle; sonst nur für Absender und Empfänger sichtbar. */
  recipient_id: string | null;
  /** Verweis auf die Notiz, auf die geantwortet wird. */
  parent_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};

/** Sprache des Benutzers; die Beschriftungen liegen in den Wörterbüchern. */
export type UserLocale = "de" | "en";
