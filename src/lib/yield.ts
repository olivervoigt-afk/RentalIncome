import type { Investment, InvestmentExpense } from "./types";

/**
 * Kennzahlen einer Investition.
 *
 * Bewusst nur Grössen, die sich aus Bekanntem ergeben: was bezahlt wurde und
 * was tatsächlich geflossen ist. Wo geschätzt wird, sagt es ein Kennzeichen.
 */
export type YieldFigures = {
  /** Nebenkosten in Euro — absolut, sonst aus dem Prozentsatz. */
  costs: number;
  /** Kaufpreis + Nebenkosten + nachträgliche Investitionen. */
  total: number;
  /** Summe aller nachträglichen Investitionen. */
  expenses: number;
  /** Tatsächlich geflossene Miete aller zugeordneten Mietverhältnisse. */
  income: number;
  /** Jahresmiete der laufenden Verträge. */
  annualRent: number;
  /** income ÷ total. null, wenn kein Kaufpreis hinterlegt ist. */
  payback: number | null;
  /** annualRent ÷ total. */
  grossYield: number | null;
  /** (annualRent − laufende Kosten) ÷ total; null ohne Kostenangabe. */
  netYield: number | null;
  /** Jahre bis zur Amortisation bei heutiger Miete; null wenn erreicht. */
  yearsToPayback: number | null;
  /** Rendite, die bei ortsüblicher Miete erreichbar wäre. */
  marketYield: number | null;
  /** Ortsübliche Miete − tatsächliche Jahresmiete; was bewusst verzichtet wird. */
  foregone: number | null;
  /** Verkehrswert − Gesamtinvest; null ohne Bewertung. */
  appreciation: number | null;
  /** Nur bei verkauften: Einnahmen + Verkaufspreis − Gesamtinvest. */
  result: number | null;
  sold: boolean;
};

/** Nebenkosten: der absolute Betrag sticht den Prozentsatz. */
export function acquisitionCosts(investment: Investment): number {
  if (investment.costs_amount !== null) return Number(investment.costs_amount);
  if (investment.costs_percent !== null && investment.purchase_price !== null) {
    return (Number(investment.purchase_price) * Number(investment.costs_percent)) / 100;
  }
  return 0;
}

export function computeYield({
  investment,
  expenses,
  income,
  annualRent,
}: {
  investment: Investment;
  expenses: InvestmentExpense[];
  /** Summe der tatsächlich eingegangenen Miete, ohne Gutschriften und Kautionen. */
  income: number;
  annualRent: number;
}): YieldFigures {
  const price = investment.purchase_price === null ? null : Number(investment.purchase_price);
  const costs = acquisitionCosts(investment);
  const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const total = (price ?? 0) + costs + spent;

  const annualCosts =
    investment.annual_costs === null ? null : Number(investment.annual_costs);
  const netAnnual = annualCosts === null ? null : annualRent - annualCosts;

  // Ohne Kaufpreis ergibt jede Verhältniszahl null statt einer Division durch
  // null — die Zeile erscheint dann als "ohne Kaufdaten".
  const ratio = (value: number) => (price === null || total <= 0 ? null : value / total);

  const outstanding = total - income;
  const yearly = netAnnual ?? annualRent;

  return {
    costs,
    total,
    expenses: spent,
    income,
    annualRent,
    payback: ratio(income),
    grossYield: ratio(annualRent),
    netYield: netAnnual === null ? null : ratio(netAnnual),
    marketYield:
      investment.market_rent === null ? null : ratio(Number(investment.market_rent)),
    foregone:
      investment.market_rent === null
        ? null
        : Number(investment.market_rent) - annualRent,
    yearsToPayback:
      price === null || outstanding <= 0 || yearly <= 0 ? null : outstanding / yearly,
    appreciation:
      investment.valuation === null || price === null
        ? null
        : Number(investment.valuation) - total,
    result:
      investment.sold_on && investment.sale_price !== null && price !== null
        ? income + Number(investment.sale_price) - total
        : null,
    sold: Boolean(investment.sold_on),
  };
}

/** Woran der Betrachter erkennt, wie belastbar eine Zeile ist. */
export type YieldFlag = "noPurchase" | "gross" | "incomplete" | "sold";

export function yieldFlags(
  investment: Investment,
  figures: YieldFigures,
  /** Datum der ersten erfassten Zahlung; null, wenn es keine gibt. */
  firstPayment: string | null,
): YieldFlag[] {
  const flags: YieldFlag[] = [];

  if (investment.purchase_price === null) flags.push("noPurchase");
  if (investment.annual_costs === null && figures.total > 0) flags.push("gross");

  // Der Bestand ist älter als seine Erfassung: liegt der Kauf mehr als ein
  // Jahr vor der ersten Zahlung, fehlen Einnahmen in der Rechnung.
  if (investment.purchased_on && firstPayment) {
    const kauf = new Date(investment.purchased_on);
    const erste = new Date(firstPayment);
    const jahr = 365 * 24 * 60 * 60 * 1000;
    if (erste.getTime() - kauf.getTime() > jahr) flags.push("incomplete");
  }

  if (figures.sold) flags.push("sold");

  return flags;
}
