import Link from "next/link";
import { redirect } from "next/navigation";
import TabNav from "@/components/tab-nav";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { fill, plural, type Dict } from "@/lib/i18n/dictionaries";
import { getInvestments, getPropertiesWithSummary, type InvestmentRow } from "@/lib/queries";
import type { YieldFlag } from "@/lib/yield";

export const metadata = { title: "Rendite" };

const TABS = ["bestand", "verkauft"] as const;
type Tab = (typeof TABS)[number];

export default async function YieldPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireProfile();
  // Kaufpreise sind das Sensibelste im System. Die Datenbank gäbe einem Leser
  // ohnehin nichts heraus; hier endet der Weg schon vorher.
  if (profile.role === "viewer") redirect("/");

  const [{ tab: requested }, rows, properties, { t, locale }] = await Promise.all([
    searchParams,
    getInvestments(),
    getPropertiesWithSummary(),
    getDict(),
  ]);
  const f = formatters(locale);

  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "bestand";

  /* Bestand und Verkauftes beantworten verschiedene Fragen: dort was das
     Objekt jährlich bringt, hier was am Ende dabei herausgekommen ist. Eine
     gemeinsame Tabelle müsste beide Spaltensätze tragen und keiner Frage
     ganz gerecht werden. */
  const held = rows.filter((r) => !r.figures.sold);
  const sold = rows.filter((r) => r.figures.sold);
  const shown = tab === "verkauft" ? sold : held;

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

      <TabNav
        active={tab}
        basePath="/rendite"
        defaultKey="bestand"
        items={[
          { key: "bestand", label: t.yield.tabHeld, count: held.length },
          { key: "verkauft", label: t.yield.tabSold, count: sold.length },
        ]}
      />

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            title={tab === "verkauft" ? t.yield.emptySold : t.yield.empty}
            description={tab === "verkauft" ? t.yield.emptySoldHint : t.yield.emptyHint}
          />
        </Card>
      ) : tab === "verkauft" ? (
        <SoldView t={t} f={f} rows={shown} />
      ) : (
        <HeldView t={t} f={f} rows={shown} />
      )}

      {tab === "bestand" && unassigned.length > 0 && (
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

/* ---------------- Bestand ---------------- */

function HeldView({
  t,
  f,
  rows,
}: {
  t: Dict;
  f: ReturnType<typeof formatters>;
  rows: InvestmentRow[];
}) {
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.figures.total,
      income: acc.income + r.figures.income,
      annual: acc.annual + r.figures.annualRent,
      value: acc.value + (r.investment.valuation === null ? 0 : Number(r.investment.valuation)),
    }),
    { total: 0, income: 0, annual: 0, value: 0 },
  );

  return (
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

      <Card>
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
                <th className="px-5 py-3 text-right font-medium">{t.yield.valuation}</th>
                <th className="px-5 py-3 text-right font-medium">{t.yield.appreciation}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ investment, location, figures, flags, properties }) => (
                <tr key={investment.id} className="border-b border-border/60 last:border-0">
                  <Name
                    t={t}
                    name={investment.name}
                    id={investment.id}
                    location={location}
                    count={properties.length}
                    flags={flags}
                  />
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
                  <td className="tabular px-5 py-3 text-right text-muted">
                    {investment.valuation === null
                      ? t.common.none
                      : f.euro(Number(investment.valuation))}
                  </td>
                  <Money t={t} f={f} value={figures.appreciation} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                <td className="px-5 py-3">{t.dashboard.total}</td>
                <td className="tabular px-5 py-3 text-right">{f.euro(totals.total)}</td>
                <td className="tabular px-5 py-3 text-right">{f.euro(totals.income)}</td>
                <td colSpan={2} />
                <td className="tabular px-5 py-3 text-right">
                  {totals.value > 0 ? f.euro(totals.value) : ""}
                </td>
                <td className="tabular px-5 py-3 text-right">
                  {totals.value > 0 ? f.euro(totals.value - totals.total) : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted">{t.yield.flagLegend}</p>
    </>
  );
}

/* ---------------- Verkauft ---------------- */

function SoldView({
  t,
  f,
  rows,
}: {
  t: Dict;
  f: ReturnType<typeof formatters>;
  rows: InvestmentRow[];
}) {
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.figures.total,
      income: acc.income + r.figures.income,
      proceeds: acc.proceeds + (r.figures.netProceeds ?? 0),
      result: acc.result + (r.figures.result ?? 0),
    }),
    { total: 0, income: 0, proceeds: 0, result: 0 },
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.yield.total} value={f.euro(totals.total)} />
        <Stat label={t.yield.income} value={f.euro(totals.income)} />
        <Stat label={t.yield.netProceeds} value={f.euro(totals.proceeds)} />
        <Stat label={t.yield.result} value={f.euro(totals.result)} tone />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-[26%] min-w-[220px] px-5 py-3 font-medium">
                  {t.yield.investment}
                </th>
                <th className="px-5 py-3 font-medium">{t.yield.soldOn}</th>
                <th className="px-5 py-3 text-right font-medium">{t.yield.total}</th>
                <th className="px-5 py-3 text-right font-medium">{t.yield.income}</th>
                <th className="px-5 py-3 text-right font-medium">{t.yield.netProceeds}</th>
                <th className="px-5 py-3 text-right font-medium">{t.yield.result}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ investment, location, figures, flags, properties }) => (
                <tr key={investment.id} className="border-b border-border/60 last:border-0">
                  <Name
                    t={t}
                    name={investment.name}
                    id={investment.id}
                    location={location}
                    count={properties.length}
                    flags={flags.filter((flag) => flag !== "sold")}
                  />
                  <td className="px-5 py-3 text-muted">
                    {investment.sold_on ? f.date(investment.sold_on) : t.common.none}
                    {figures.years !== null && (
                      <span className="block text-xs">
                        {fill(t.yield.heldYears, { n: figures.years.toFixed(1) })}
                      </span>
                    )}
                  </td>
                  <td className="tabular px-5 py-3 text-right">{f.euro(figures.total)}</td>
                  <td className="tabular px-5 py-3 text-right">{f.euro(figures.income)}</td>
                  <td className="tabular px-5 py-3 text-right">
                    {figures.netProceeds === null ? t.common.none : f.euro(figures.netProceeds)}
                  </td>
                  <Money t={t} f={f} value={figures.result} bold />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                <td className="px-5 py-3" colSpan={2}>
                  {t.dashboard.total}
                </td>
                <td className="tabular px-5 py-3 text-right">{f.euro(totals.total)}</td>
                <td className="tabular px-5 py-3 text-right">{f.euro(totals.income)}</td>
                <td className="tabular px-5 py-3 text-right">{f.euro(totals.proceeds)}</td>
                <td
                  className={`tabular px-5 py-3 text-right ${
                    totals.result < 0 ? "text-negative" : "text-positive"
                  }`}
                >
                  {f.euro(totals.result)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted">{t.yield.resultHint}</p>
    </>
  );
}

/* ---------------- Bausteine ---------------- */

function Name({
  t,
  name,
  id,
  location,
  count,
  flags,
}: {
  t: Dict;
  name: string;
  id: string;
  location: string | null;
  count: number;
  flags: YieldFlag[];
}) {
  return (
    <td className="px-5 py-3 align-top">
      <Link href={`/rendite/${id}`} className="font-medium hover:text-accent hover:underline">
        {name}
      </Link>
      <span className="block text-xs text-muted">
        {location ?? t.reports.noLocation} · {plural(t.dashboard.countProperties, count)}
      </span>
      <Flags t={t} flags={flags} />
    </td>
  );
}

function Money({
  t,
  f,
  value,
  bold = false,
}: {
  t: Dict;
  f: ReturnType<typeof formatters>;
  value: number | null;
  bold?: boolean;
}) {
  return (
    <td
      className={`tabular px-5 py-3 text-right ${bold ? "font-medium" : ""} ${
        value === null ? "" : value < 0 ? "text-negative" : "text-positive"
      }`}
    >
      {value === null ? t.common.none : f.euro(value)}
    </td>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  const negative = tone && value.trim().startsWith("-");
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`tabular mt-1 text-2xl font-semibold ${
          tone ? (negative ? "text-negative" : "text-positive") : ""
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
