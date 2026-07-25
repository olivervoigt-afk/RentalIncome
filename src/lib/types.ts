export type UserRole = "admin" | "editor" | "viewer";
export type PaymentFrequency = "monthly" | "quarterly" | "yearly";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  editor: "Bearbeiter",
  viewer: "Leser",
};

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: "Monatlich",
  quarterly: "Quartalsweise",
  yearly: "Jährlich",
};

/** Monate zwischen zwei Fälligkeiten je Zahlungsrhythmus. */
export const FREQUENCY_MONTHS: Record<PaymentFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type PaymentSource = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
};

export type Property = {
  id: string;
  name: string;
  location: string;
  tenant_name: string;
  start_date: string;
  term_months: number;
  payment_frequency: PaymentFrequency;
  ta24: boolean;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
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
  storage_path: string;
  size_bytes: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
};
