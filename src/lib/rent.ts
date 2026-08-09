import { addMonths, differenceInMonths, isAfter, isBefore } from "date-fns";
import {
  FREQUENCY_MONTHS,
  type Credit,
  type Payment,
  type Property,
  type RentPeriod,
} from "./types";

/**
 * Wandelt ein Postgres-Datum ("YYYY-MM-DD") in ein lokales Date um.
 * Bewusst ohne new Date(string), da das je nach Zeitzone einen Tag verschiebt.
 */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formatiert ein Date als "YYYY-MM-DD" für die Datenbank. */
export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Vertragsende = Mietbeginn + Laufzeit. Der letzte Miettag liegt einen Tag davor. */
export function contractEnd(property: Property): Date {
  return addMonths(parseDate(property.start_date), property.term_months);
}

/** Verbleibende Vertragsmonate ab Stichtag, nie negativ. */
export function remainingMonths(property: Property, asOf: Date = new Date()): number {
  return Math.max(0, differenceInMonths(contractEnd(property), asOf));
}

export function isExpired(property: Property, asOf: Date = new Date()): boolean {
  return !isAfter(contractEnd(property), asOf);
}

/** Der zum Stichtag gültige Mietbetrag aus der Staffel. */
export function rateAt(date: Date, periods: RentPeriod[]): number | null {
  let best: RentPeriod | null = null;

  for (const period of periods) {
    const from = parseDate(period.valid_from);
    if (isBefore(date, from)) continue;
    if (period.valid_to && isAfter(date, parseDate(period.valid_to))) continue;
    // Bei Überschneidungen gewinnt der Zeitraum mit dem spätesten Beginn.
    if (!best || isAfter(from, parseDate(best.valid_from))) best = period;
  }

  return best ? Number(best.amount) : null;
}

export type Installment = {
  dueDate: Date;
  /** null, wenn für diesen Termin keine Mietstaffel hinterlegt ist. */
  amount: number | null;
};

/**
 * Alle Mietraten des gesamten Vertrags. Die erste Rate ist am Mietbeginn
 * fällig, jede weitere im Abstand des Zahlungsrhythmus. Fällt der Stichtag
 * auf einen im Zielmonat nicht existierenden Tag (z. B. 31.), wird auf den
 * letzten Tag des Monats gekürzt.
 *
 * Wurde der Fälligkeitstag mitten in der Laufzeit umgestellt, laufen die
 * Raten bis dahin auf dem alten Tag und danach auf dem neuen. Zwischen der
 * letzten alten und der ersten neuen Rate liegt dann ein kürzerer Abstand —
 * es entsteht eine zusätzliche Rate. Genau so wurde es auch abgerechnet.
 */
export function installments(property: Property, periods: RentPeriod[]): Installment[] {
  const start = parseDate(property.start_date);
  const end = contractEnd(property);
  const step = FREQUENCY_MONTHS[property.payment_frequency];
  const switchDate = property.due_day_from ? parseDate(property.due_day_from) : null;
  const result: Installment[] = [];

  const add = (dueDate: Date) =>
    result.push({ dueDate, amount: rateAt(dueDate, periods) });

  // Absicherung gegen fehlerhafte Stammdaten (z. B. term_months = 0).
  // Nach einer Umstellung können ein paar Termine mehr anfallen als Perioden.
  const maxCount = Math.ceil(property.term_months / step) + 2;

  for (let i = 0; i < maxCount; i++) {
    const dueDate = addMonths(start, i * step);
    if (!isBefore(dueDate, end)) break;
    // Ab der Umstellung übernimmt die zweite Reihe.
    if (switchDate && !isBefore(dueDate, switchDate)) break;
    add(dueDate);
  }

  if (switchDate) {
    for (let i = 0; i < maxCount; i++) {
      const dueDate = addMonths(switchDate, i * step);
      if (!isBefore(dueDate, end)) break;
      add(dueDate);
    }
  }

  return result;
}

/**
 * Jahresmiete auf Basis der heute gültigen Rate — was der Vertrag über
 * zwölf Monate einbringt, wenn sich nichts ändert. Bei abgelaufenen
 * Verträgen null, denn sie bringen nichts mehr.
 */
export function annualRent(
  property: Property,
  periods: RentPeriod[],
  asOf: Date = new Date(),
): number {
  if (isExpired(property, asOf)) return 0;

  const rate = rateAt(asOf, periods) ?? rateAt(parseDate(property.start_date), periods);
  if (rate === null) return 0;

  return (rate * 12) / FREQUENCY_MONTHS[property.payment_frequency];
}

/** Summe der Raten, die im angegebenen Zeitfenster fällig werden. */
export function dueBetween(
  property: Property,
  periods: RentPeriod[],
  from: Date,
  to: Date,
): number {
  return installments(property, periods)
    .filter((i) => i.dueDate >= from && i.dueDate <= to)
    .reduce((total, i) => total + (i.amount ?? 0), 0);
}

export type PropertySummary = {
  /** Summe aller bis zum Stichtag fälligen Raten. */
  totalDue: number;
  /** Summe aller Raten über die gesamte Vertragslaufzeit. */
  totalContract: number;
  totalReceived: number;
  totalCredits: number;
  /** Erhalten + Gutschriften − fällig. Negativ = Rückstand. */
  balance: number;
  remainingMonths: number;
  contractEnd: Date;
  expired: boolean;
  /** true, wenn für mindestens einen fälligen Termin keine Miete hinterlegt ist. */
  hasMissingRates: boolean;
};

export function summarize(
  property: Property,
  periods: RentPeriod[],
  payments: Payment[],
  credits: Credit[],
  asOf: Date = new Date(),
): PropertySummary {
  const all = installments(property, periods);
  const due = all.filter((i) => !isAfter(i.dueDate, asOf));

  const sum = (items: Installment[]) =>
    items.reduce((acc, i) => acc + (i.amount ?? 0), 0);

  const totalDue = sum(due);
  const totalReceived = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalCredits = credits.reduce((acc, c) => acc + Number(c.amount), 0);

  return {
    totalDue,
    totalContract: sum(all),
    totalReceived,
    totalCredits,
    balance: totalReceived + totalCredits - totalDue,
    remainingMonths: remainingMonths(property, asOf),
    contractEnd: contractEnd(property),
    expired: isExpired(property, asOf),
    hasMissingRates: due.some((i) => i.amount === null),
  };
}

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatEuro(value: number): string {
  return EUR.format(value);
}

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(value: string | Date): string {
  return DATE_FMT.format(typeof value === "string" ? parseDate(value) : value);
}
