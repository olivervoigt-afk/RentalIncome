import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { plural, type Dict } from "@/lib/i18n/dictionaries";
import { getInvestments, getPropertiesWithSummary, type InvestmentRow } from "@/lib/queries";
import type { YieldFlag } from "@/lib/yield";

export const metadata = { title: "Rendite" };

export default async function YieldPage() {
  const profile = await requireProfile();
  // Kaufpreise sind das Sensibelste im System. Die Datenbank gäbe einem Leser
  // ohnehin nichts heraus; hier endet der Weg schon vorher.
  if (profile.role === "viewer") redirect("/");

  const [rows, properties, { t, locale }] = await Promise.all([
    getInvestments(),
    getPropertiesWithSummary(),
    getDict(),
  ]);
  const f = formatters(locale);

  const open = rows.filter((r) => !r.figures.sold);
  const sold = rows.filter((r) => r.figures.sold);

  const totals = open.reduce(
    (acc, r) => ({
      total: acc.total + r.figures.total,
      income: acc.income + r.figures.income,
      annual: acc.annual + r.figures.annualRent,
    }),
    { total: 0, income: 0, annual: 0 },
  );

  const unassigned = properties.filter((p) => !p.investment_id && !p.archived);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.yield.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">{t.yield.intro}</p>
        </div>
        <ButtonLink href="/rendite/neu">{t.yield.newInvestment}</ButtonLink>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={t.yield.empty} description={t.yield.emptyHint} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t.yield.total} value={f.euro(totals.total)} />
            <Stat label={t.yield.income} value={f.euro(totals.income)} />
            <Stat
              label={t.yield.payback}
              value={totals.total > 0 ? f.percent(totals.income / totals.total) : t.common.none}
            />
            <Stat
              label={t.yield.grossYield}
              value={totals.total > 0 ? f.percent(totals.annual / totals.total) : t.common.none}
            />
          </div>

          <InvestmentTable t={t} f={f} rows={open} title={t.yield.title} />

          {sold.length > 0 && (
            <InvestmentTable t={t} f={f} rows={sold} title={t.yield.flagSold} showResult />
          )}

          <p className="text-xs text-muted">{t.yield.flagLegend}</p>
        </>
      )}

      {unassigned.length > 0 && (
        <Card>
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">
              {t.yield.unassignedTitle}
              <span className="ml-2 text-sm font-normal text-muted">
                {plural(t.dashboard.countProperties, unassigned.length)}
              </span>
            </h2>
            <p className="mt-0.5 text-sm text-muted">{t.yield.unassignedHint}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 px-5 py-4 text-sm">
            {unassigned.map((p) => (
              <li key={p.id}>
                <Link href={`/objekte/${p.id}`} className="hover:text-accent hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function InvestmentTable({
  t,
  f,
  rows,
  title,
  showResult = false,
}: {
  t: Dict;
  f: ReturnType<typeof formatters>;
  rows: InvestmentRow[];
  title: string;
  showResult?: boolean;
}) {
  return (
    <Card>
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold">
          {title}
          <span className="ml-2 text-sm font-normal text-muted">
            {plural(t.yield.investments, rows.length)}
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-[28%] min-w-[220px] px-5 py-3 font-medium">
                {t.yield.investment}
              </th>
              <th className="px-5 py-3 text-right font-medium">{t.yield.total}</th>
              <th className="px-5 py-3 text-right font-medium">{t.yield.income}</th>
              <th className="px-5 py-3 text-right font-medium">{t.yield.payback}</th>
              <th className="px-5 py-3 text-right font-medium">{t.yield.grossYield}</th>
              <th className="px-5 py-3 text-right font-medium">
                {showResult ? t.yield.result : t.yield.appreciation}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ investment, location, figures, flags, properties }) => (
              <tr key={investment.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3 align-top">
                  <Link
                    href={`/rendite/${investment.id}`}
                    className="font-medium hover:text-accent hover:underline"
                  >
                    {investment.name}
                  </Link>
                  <span className="block text-xs text-muted">
                    {location ?? t.reports.noLocation} ·{" "}
                    {plural(t.dashboard.countProperties, properties.length)}
                  </span>
                  <Flags t={t} flags={flags} />
                </td>
                <td className="tabular px-5 py-3 text-right">
                  {figures.total > 0 ? f.euro(figures.total) : t.common.none}
                </td>
                <td className="tabular px-5 py-3 text-right">{f.euro(figures.income)}</td>
                <td className="tabular px-5 py-3 text-right">
                  {figures.payback === null ? t.common.none : f.percent(figures.payback)}
                </td>
                <td className="tabular px-5 py-3 text-right font-medium">
                  {figures.grossYield === null ? t.common.none : f.percent(figures.grossYield)}
                </td>
                <td
                  className={`tabular px-5 py-3 text-right ${
                    (showResult ? figures.result : figures.appreciation) === null
                      ? ""
                      : (showResult ? figures.result! : figures.appreciation!) < 0
                        ? "text-negative"
                        : "text-positive"
                  }`}
                >
                  {showResult
                    ? figures.result === null
                      ? t.common.none
                      : f.euro(figures.result)
                    : figures.appreciation === null
                      ? t.common.none
                      : f.euro(figures.appreciation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Flags({ t, flags }: { t: Dict; flags: YieldFlag[] }) {
  const label: Record<YieldFlag, string> = {
    noPurchase: t.yield.flagNoPurchase,
    gross: t.yield.flagGross,
    incomplete: t.yield.flagIncomplete,
    sold: t.yield.flagSold,
  };

  if (flags.length === 0) return null;

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {flags.map((flag) => (
        <Badge key={flag} tone={flag === "noPurchase" ? "negative" : "neutral"}>
          {label[flag]}
        </Badge>
      ))}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
