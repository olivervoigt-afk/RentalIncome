import Link from "next/link";
import type { Dict } from "@/lib/i18n/dictionaries";
import { Badge, ButtonLink, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { getTa24Report } from "@/lib/queries";
import { fill, plural } from "@/lib/i18n/dictionaries";

export const metadata = { title: "TA24" };

export default async function Ta24Page({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { jahr } = await searchParams;
  const [report, { t, locale }] = await Promise.all([getTa24Report(), getDict()]);
  const f = formatters(locale);

  if (report.years.length === 0) {
    return (
      <div className="space-y-6">
        <Header t={t} />
        <Card>
          <EmptyState
            title={t.ta24.emptyTitle}
            description={t.ta24.emptyHint}
          />
        </Card>
      </div>
    );
  }

  const selected = report.years.includes(Number(jahr))
    ? Number(jahr)
    : report.years[0];

  // Nur Objekte anzeigen, die im gewählten Jahr tatsächlich Geld gebracht haben.
  const rows = report.rows
    .filter((r) => (r.byYear.get(selected)?.count ?? 0) > 0)
    .sort((a, b) => (b.byYear.get(selected)?.sum ?? 0) - (a.byYear.get(selected)?.sum ?? 0));

  const yearTotal = report.totalsByYear.get(selected) ?? { count: 0, sum: 0 };

  return (
    <div className="space-y-6">
      <Header t={t} />

      {/* Überblick über alle Jahre */}
      <Card>
        <CardHeader
          title={t.ta24.allYears}
          description={t.ta24.allYearsHint}
          action={
            <ButtonLink href="/ta24/export" variant="secondary" prefetch={false}>
              {t.ta24.exportAll}
            </ButtonLink>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">{t.ta24.year}</th>
                <th className="px-5 py-3 text-right font-medium">{t.ta24.payments}</th>
                <th className="px-5 py-3 text-right font-medium">{t.ta24.received}</th>
              </tr>
            </thead>
            <tbody>
              {report.years.map((year) => {
                const cell = report.totalsByYear.get(year)!;
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
                        href={`/ta24?jahr=${year}`}
                        className={`font-medium hover:underline ${
                          active ? "text-accent" : "hover:text-accent"
                        }`}
                      >
                        {year}
                      </Link>
                    </td>
                    <td className="tabular px-5 py-3 text-right text-muted">
                      {cell.count}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {f.euro(cell.sum)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                <td className="px-5 py-3">{t.ta24.total}</td>
                <td className="tabular px-5 py-3 text-right text-muted">
                  {[...report.totalsByYear.values()].reduce((a, c) => a + c.count, 0)}
                </td>
                <td className="tabular px-5 py-3 text-right">
                  {f.euro(report.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Aufschlüsselung des gewählten Jahres */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">
            {fill(t.ta24.breakdown, { year: selected })}
            <span className="ml-2 text-sm font-normal text-muted">
              {plural(t.ta24.countProperties, rows.length)} · {plural(t.ta24.countPayments, yearTotal.count)}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-1">
            {report.years.map((year) => (
              <Link
                key={year}
                href={`/ta24?jahr=${year}`}
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
              href={`/ta24/export?jahr=${selected}`}
              variant="secondary"
              prefetch={false}
              className="ml-2"
            >
              {fill(t.ta24.exportYear, { year: selected })}
            </ButtonLink>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-[40%] min-w-[240px] px-5 py-3 font-medium">{t.ta24.property}</th>
                <th className="px-5 py-3 font-medium">{t.ta24.location}</th>
                <th className="px-5 py-3 text-right font-medium">{t.ta24.payments}</th>
                <th className="px-5 py-3 text-right font-medium">{fill(t.ta24.receivedIn, { year: selected })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cell = row.byYear.get(selected)!;

                return (
                  <tr key={row.propertyId} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/objekte/${row.propertyId}?tab=zahlungen&jahr=${selected}`}
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.archived && (
                        <span className="ml-2">
                          <Badge>{t.ta24.archived}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{row.location ?? t.common.none}</td>
                    <td className="tabular px-5 py-3 text-right text-muted">{cell.count}</td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {f.euro(cell.sum)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                <td className="px-5 py-3" colSpan={2}>
                  {fill(t.ta24.sumOf, { year: selected })}
                </td>
                <td className="tabular px-5 py-3 text-right text-muted">
                  {yearTotal.count}
                </td>
                <td className="tabular px-5 py-3 text-right text-lg">
                  {f.euro(yearTotal.sum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Header({ t }: { t: Dict }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.ta24.title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t.ta24.intro}</p>
    </div>
  );
}
