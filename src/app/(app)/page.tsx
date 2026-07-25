import Link from "next/link";
import ArchiveToggle from "@/components/archive-toggle";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getPropertiesWithSummary, type PropertyWithSummary } from "@/lib/queries";
import { formatDate, formatEuro } from "@/lib/rent";
import { NO_LOCATION } from "@/lib/types";

export const metadata = { title: "Dashboard" };

type Totals = { due: number; received: number; credits: number; balance: number };

function sum(list: PropertyWithSummary[]): Totals {
  return list.reduce(
    (acc, p) => ({
      due: acc.due + p.summary.totalDue,
      received: acc.received + p.summary.totalReceived,
      credits: acc.credits + p.summary.totalCredits,
      balance: acc.balance + p.summary.balance,
    }),
    { due: 0, received: 0, credits: 0, balance: 0 },
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ archiv?: string }>;
}) {
  const { archiv } = await searchParams;
  const showArchived = archiv === "1";

  const [profile, all] = await Promise.all([
    getProfile(),
    getPropertiesWithSummary(),
  ]);

  const canEdit = profile?.role !== "viewer";
  const hidden = all.filter((p) => p.archived || p.summary.expired);
  const rows = showArchived ? all : all.filter((p) => !p.archived && !p.summary.expired);

  const totals = sum(rows);
  const hiddenTotals = showArchived ? null : sum(hidden);

  // Gruppierung nach Standort; Objekte ohne Standort stehen am Ende.
  const groups = new Map<string, PropertyWithSummary[]>();
  for (const property of rows) {
    const key = property.location ?? NO_LOCATION;
    groups.set(key, [...(groups.get(key) ?? []), property]);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === NO_LOCATION) return 1;
    if (b === NO_LOCATION) return -1;
    return a.localeCompare(b, "de");
  });

  const columnCount = canEdit ? 8 : 7;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? "Objekt" : "Objekte"}
            {orderedGroups.length > 1 && ` in ${orderedGroups.length} Standorten`}
            {hidden.length > 0 && !showArchived && ` · ${hidden.length} ausgeblendet`}
          </p>
        </div>
        {canEdit && <ButtonLink href="/objekte/neu">Objekt anlegen</ButtonLink>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fällig bisher" value={formatEuro(totals.due)} />
        <StatCard label="Erhalten" value={formatEuro(totals.received)} />
        <StatCard label="Gutschriften" value={formatEuro(totals.credits)} />
        <StatCard
          label="Saldo"
          value={formatEuro(totals.balance)}
          tone={totals.balance < 0 ? "negative" : "positive"}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Objektübersicht</h2>
          <ArchiveToggle active={showArchived} count={hidden.length} />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "Noch keine Objekte angelegt" : "Keine aktiven Objekte"}
            description={
              all.length === 0
                ? "Lege dein erstes Objekt an."
                : "Alle Objekte sind archiviert oder ihre Verträge sind abgelaufen."
            }
            action={
              canEdit && all.length === 0 ? (
                <ButtonLink href="/objekte/neu">Objekt anlegen</ButtonLink>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-[30%] min-w-[240px] px-5 py-3 font-medium">
                    Objekt
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Fällig bisher</th>
                  <th className="px-5 py-3 text-right font-medium">Erhalten</th>
                  <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  <th className="px-5 py-3 text-right font-medium">Restlaufzeit</th>
                  <th className="px-5 py-3 font-medium">Vertragsende</th>
                  <th className="px-5 py-3 text-center font-medium">TA24</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>

              {orderedGroups.map(([location, items]) => {
                const groupTotals = sum(items);

                return (
                  <tbody key={location}>
                    <tr className="border-y-2 border-border bg-surface-muted">
                      <th
                        scope="colgroup"
                        colSpan={columnCount}
                        className="border-l-4 border-accent px-5 py-3 text-left"
                      >
                        <span className="text-lg font-bold tracking-tight">
                          {location}
                        </span>
                        <span className="ml-3 text-sm font-normal text-muted">
                          {items.length} {items.length === 1 ? "Objekt" : "Objekte"}
                          {" · Saldo "}
                          <span
                            className={`tabular font-medium ${
                              groupTotals.balance < 0 ? "text-negative" : "text-positive"
                            }`}
                          >
                            {formatEuro(groupTotals.balance)}
                          </span>
                        </span>
                      </th>
                    </tr>

                    {items.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/60 hover:bg-surface-muted/40"
                      >
                        <td className="px-5 py-3 align-top">
                          <Link
                            href={`/objekte/${p.id}`}
                            className="font-medium text-balance hover:text-accent hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.tenant_name && (
                            <span className="block text-xs text-muted">{p.tenant_name}</span>
                          )}
                          <div className="mt-0.5 flex flex-wrap gap-1.5">
                            {p.archived && <Badge>Archiviert</Badge>}
                            {!p.archived && p.summary.expired && <Badge>Abgelaufen</Badge>}
                            {p.summary.hasMissingRates && (
                              <Badge tone="negative">Miete fehlt</Badge>
                            )}
                          </div>
                        </td>
                        <td className="tabular px-5 py-3 text-right">
                          {formatEuro(p.summary.totalDue)}
                        </td>
                        <td className="tabular px-5 py-3 text-right">
                          {formatEuro(p.summary.totalReceived)}
                          {p.summary.totalCredits > 0 && (
                            <span className="block text-xs text-muted">
                              + {formatEuro(p.summary.totalCredits)} Gutschrift
                            </span>
                          )}
                        </td>
                        <td
                          className={`tabular px-5 py-3 text-right font-medium ${
                            p.summary.balance < 0 ? "text-negative" : "text-positive"
                          }`}
                        >
                          {formatEuro(p.summary.balance)}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-muted">
                          {p.summary.remainingMonths > 0
                            ? `${p.summary.remainingMonths} Mon.`
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {formatDate(p.summary.contractEnd)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {p.ta24 ? (
                            <Badge tone="accent">Ja</Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/objekte/${p.id}?tab=zahlungen`}
                              className="whitespace-nowrap text-sm text-accent hover:underline"
                            >
                              + Zahlung
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}

                    {orderedGroups.length > 1 && (
                      <tr className="border-b border-border text-muted">
                        <td className="px-5 py-2 text-right text-xs uppercase tracking-wide">
                          Summe {location}
                        </td>
                        <td className="tabular px-5 py-2 text-right">
                          {formatEuro(groupTotals.due)}
                        </td>
                        <td className="tabular px-5 py-2 text-right">
                          {formatEuro(groupTotals.received)}
                        </td>
                        <td
                          className={`tabular px-5 py-2 text-right font-medium ${
                            groupTotals.balance < 0 ? "text-negative" : "text-positive"
                          }`}
                        >
                          {formatEuro(groupTotals.balance)}
                        </td>
                        <td colSpan={canEdit ? 4 : 3} />
                      </tr>
                    )}
                  </tbody>
                );
              })}

              <tfoot>
                <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                  <td className="px-5 py-3">Gesamt</td>
                  <td className="tabular px-5 py-3 text-right">{formatEuro(totals.due)}</td>
                  <td className="tabular px-5 py-3 text-right">
                    {formatEuro(totals.received)}
                  </td>
                  <td
                    className={`tabular px-5 py-3 text-right ${
                      totals.balance < 0 ? "text-negative" : "text-positive"
                    }`}
                  >
                    {formatEuro(totals.balance)}
                  </td>
                  <td colSpan={canEdit ? 4 : 3} />
                </tr>

                {hiddenTotals && hidden.length > 0 && (
                  <>
                    <tr className="text-muted">
                      <td className="px-5 py-2">
                        zzgl. {hidden.length} ausgeblendete
                        {hidden.length === 1 ? "s Objekt" : " Objekte"}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {formatEuro(hiddenTotals.due)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {formatEuro(hiddenTotals.received)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {formatEuro(hiddenTotals.balance)}
                      </td>
                      <td colSpan={canEdit ? 4 : 3} />
                    </tr>
                    <tr className="border-t border-border font-medium">
                      <td className="px-5 py-2">Alle Objekte</td>
                      <td className="tabular px-5 py-2 text-right">
                        {formatEuro(totals.due + hiddenTotals.due)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {formatEuro(totals.received + hiddenTotals.received)}
                      </td>
                      <td
                        className={`tabular px-5 py-2 text-right ${
                          totals.balance + hiddenTotals.balance < 0
                            ? "text-negative"
                            : "text-positive"
                        }`}
                      >
                        {formatEuro(totals.balance + hiddenTotals.balance)}
                      </td>
                      <td colSpan={canEdit ? 4 : 3} />
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`tabular mt-1 text-2xl font-semibold ${
          tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : ""
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
