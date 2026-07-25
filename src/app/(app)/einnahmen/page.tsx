import Link from "next/link";
import { Badge, ButtonLink, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { fill, plural, type Dict } from "@/lib/i18n/dictionaries";
import { getAnnualIncome, type IncomeRow, type Ta24Cell } from "@/lib/queries";

export const metadata = { title: "Jahreseinnahmen" };

/** Kennung für Objekte ohne Standort — als Wert in der Adresse. */
const WITHOUT = "ohne";
const ALL = "alle";

const emptyCell = (): Ta24Cell => ({ count: 0, sum: 0, reductions: 0, taxable: 0 });

function addTo(target: Ta24Cell, cell: Ta24Cell) {
  target.count += cell.count;
  target.sum += cell.sum;
  target.reductions += cell.reductions;
  target.taxable += cell.taxable;
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ standort?: string; jahr?: string }>;
}) {
  const { standort, jahr } = await searchParams;
  const [report, { t, locale }] = await Promise.all([getAnnualIncome(), getDict()]);
  const f = formatters(locale);

  // Deutschland ist die Voreinstellung; sonst der erste vorhandene Standort.
  const preferred = report.locations.includes("Deutschland")
    ? "Deutschland"
    : (report.locations[0] ?? ALL);

  const choices = [...report.locations, WITHOUT, ALL];
  const location = standort && choices.includes(standort) ? standort : preferred;

  const rows = report.rows.filter((row) =>
    location === ALL
      ? true
      : location === WITHOUT
        ? row.location === null
        : row.location === location,
  );

  // Jahre, in denen dieser Standort überhaupt etwas gebracht hat.
  const years = report.years.filter((year) =>
    rows.some((row) => (row.byYear.get(year)?.count ?? 0) > 0),
  );

  const totalsByYear = new Map<number, Ta24Cell>();
  for (const row of rows) {
    for (const [year, cell] of row.byYear) {
      const target = totalsByYear.get(year) ?? emptyCell();
      addTo(target, cell);
      totalsByYear.set(year, target);
    }
  }

  const grand = emptyCell();
  for (const cell of totalsByYear.values()) addTo(grand, cell);

  const selected = years.includes(Number(jahr)) ? Number(jahr) : years[0];
  const yearRows = selected
    ? rows
        .filter((row) => (row.byYear.get(selected)?.count ?? 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name, locale))
    : [];
  const yearTotal = (selected && totalsByYear.get(selected)) || emptyCell();

  const label = (value: string) =>
    value === ALL
      ? t.income.allLocations
      : value === WITHOUT
        ? t.income.noLocation
        : value;

  const exportHref = (year?: number) =>
    `/einnahmen/export?standort=${encodeURIComponent(location)}` +
    (year ? `&jahr=${year}` : "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.income.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t.income.intro}</p>
      </div>

      {/* Standortwahl */}
      <div className="flex flex-wrap gap-1">
        {choices.map((value) => (
          <Link
            key={value}
            href={`/einnahmen?standort=${encodeURIComponent(value)}`}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              value === location
                ? "bg-accent text-accent-fg"
                : "border border-border text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {label(value)}
          </Link>
        ))}
      </div>

      {years.length === 0 ? (
        <Card>
          <EmptyState title={t.income.emptyTitle} description={t.income.emptyHint} />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title={label(location)}
              description={plural(t.income.countProperties, rows.length)}
              action={
                <ButtonLink href={exportHref()} variant="secondary" prefetch={false}>
                  {t.income.exportAll}
                </ButtonLink>
              }
            />
            <YearTable
              t={t}
              f={f}
              years={years}
              totals={totalsByYear}
              grand={grand}
              selected={selected}
              location={location}
              showReductions={report.hasReductions}
            />
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="text-base font-semibold">
                {fill(t.income.breakdown, { year: selected })}
                <span className="ml-2 text-sm font-normal text-muted">
                  {plural(t.income.countProperties, yearRows.length)} ·{" "}
                  {plural(t.income.countPayments, yearTotal.count)}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-1">
                {years.map((year) => (
                  <Link
                    key={year}
                    href={`/einnahmen?standort=${encodeURIComponent(location)}&jahr=${year}`}
                    className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                      year === selected
                        ? "bg-accent text-accent-fg"
                        : "text-muted hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {year}
                  </Link>
                ))}
                <ButtonLink
                  href={exportHref(selected)}
                  variant="secondary"
                  prefetch={false}
                  className="ml-2"
                >
                  {fill(t.income.exportYear, { year: selected })}
                </ButtonLink>
              </div>
            </div>

            <PropertyTable
              t={t}
              f={f}
              rows={yearRows}
              selected={selected}
              total={yearTotal}
              showReductions={report.hasReductions}
              showLocation={location === ALL}
            />
          </Card>
        </>
      )}
    </div>
  );
}

function YearTable({
  t,
  f,
  years,
  totals,
  grand,
  selected,
  location,
  showReductions,
}: {
  t: Dict;
  f: ReturnType<typeof formatters>;
  years: number[];
  totals: Map<number, Ta24Cell>;
  grand: Ta24Cell;
  selected: number;
  location: string;
  showReductions: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">{t.income.year}</th>
            <th className="px-5 py-3 text-right font-medium">{t.income.payments}</th>
            <th className="px-5 py-3 text-right font-medium">{t.income.received}</th>
            {showReductions && (
              <>
                <th className="px-5 py-3 text-right font-medium">{t.income.reductions}</th>
                <th className="px-5 py-3 text-right font-medium">{t.income.taxable}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => {
            const cell = totals.get(year) ?? emptyCell();
            const active = year === selected;

            return (
              <tr
                key={year}
                className={`border-b border-border/60 last:border-0 ${
                  active ? "bg-accent/10" : "hover:bg-surface-muted/50"
                }`}
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/einnahmen?standort=${encodeURIComponent(location)}&jahr=${year}`}
                    className={`font-medium hover:underline ${active ? "text-accent" : ""}`}
                  >
                    {year}
                  </Link>
                </td>
                <td className="tabular px-5 py-3 text-right text-muted">{cell.count}</td>
                <td className="tabular px-5 py-3 text-right">{f.euro(cell.sum)}</td>
                {showReductions && (
                  <>
                    <td className="tabular px-5 py-3 text-right text-muted">
                      {cell.reductions ? `− ${f.euro(cell.reductions)}` : t.common.none}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {f.euro(cell.taxable)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
            <td className="px-5 py-3">{t.income.total}</td>
            <td className="tabular px-5 py-3 text-right text-muted">{grand.count}</td>
            <td className="tabular px-5 py-3 text-right">{f.euro(grand.sum)}</td>
            {showReductions && (
              <>
                <td className="tabular px-5 py-3 text-right text-muted">
                  {`− ${f.euro(grand.reductions)}`}
                </td>
                <td className="tabular px-5 py-3 text-right">{f.euro(grand.taxable)}</td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PropertyTable({
  t,
  f,
  rows,
  selected,
  total,
  showReductions,
  showLocation,
}: {
  t: Dict;
  f: ReturnType<typeof formatters>;
  rows: IncomeRow[];
  selected: number;
  total: Ta24Cell;
  showReductions: boolean;
  showLocation: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-[32%] min-w-[220px] px-5 py-3 font-medium">
              {t.income.property}
            </th>
            {showLocation && <th className="px-5 py-3 font-medium">{t.form.location}</th>}
            <th className="px-5 py-3 text-right font-medium">{t.income.payments}</th>
            <th className="px-5 py-3 text-right font-medium">
              {fill(t.income.receivedIn, { year: selected })}
            </th>
            {showReductions && (
              <>
                <th className="px-5 py-3 text-right font-medium">{t.income.reductions}</th>
                <th className="px-5 py-3 text-right font-medium">{t.income.taxable}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cell = row.byYear.get(selected) ?? emptyCell();

            return (
              <tr key={row.propertyId} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">
                  <Link
                    href={`/objekte/${row.propertyId}?tab=zahlungen&jahr=${selected}`}
                    className="font-medium hover:text-accent hover:underline"
                  >
                    {row.name}
                  </Link>
                  {row.tenant && (
                    <span className="block text-xs text-muted">{row.tenant}</span>
                  )}
                  {row.archived && (
                    <span className="mt-0.5 inline-block">
                      <Badge>{t.income.archived}</Badge>
                    </span>
                  )}
                </td>
                {showLocation && (
                  <td className="px-5 py-3 text-muted">{row.location ?? t.common.none}</td>
                )}
                <td className="tabular px-5 py-3 text-right text-muted">{cell.count}</td>
                <td className="tabular px-5 py-3 text-right">{f.euro(cell.sum)}</td>
                {showReductions && (
                  <>
                    <td className="tabular px-5 py-3 text-right text-muted">
                      {cell.reductions ? `− ${f.euro(cell.reductions)}` : t.common.none}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {f.euro(cell.taxable)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
            <td className="px-5 py-3" colSpan={showLocation ? 2 : 1}>
              {fill(t.income.sumOf, { year: selected })}
            </td>
            <td className="tabular px-5 py-3 text-right text-muted">{total.count}</td>
            <td className="tabular px-5 py-3 text-right">{f.euro(total.sum)}</td>
            {showReductions && (
              <>
                <td className="tabular px-5 py-3 text-right text-muted">
                  {`− ${f.euro(total.reductions)}`}
                </td>
                <td className="tabular px-5 py-3 text-right text-lg">
                  {f.euro(total.taxable)}
                </td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
