import Link from "next/link";
import ArchiveToggle from "@/components/archive-toggle";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { getPropertiesWithSummary, type PropertyWithSummary } from "@/lib/queries";

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

  const [profile, all, { t, locale }] = await Promise.all([
    getProfile(),
    getPropertiesWithSummary(),
    getDict(),
  ]);
  const f = formatters(locale);
  const NO_LOCATION = t.dashboard.noLocation;

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
          <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {t.dashboard.countProperties(rows.length)}
            {orderedGroups.length > 1 && t.dashboard.inLocations(orderedGroups.length)}
            {hidden.length > 0 && !showArchived && t.dashboard.hiddenCount(hidden.length)}
          </p>
        </div>
        {canEdit && <ButtonLink href="/objekte/neu">{t.dashboard.newProperty}</ButtonLink>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.dashboard.dueSoFar} value={f.euro(totals.due)} />
        <StatCard label={t.dashboard.received} value={f.euro(totals.received)} />
        <StatCard label={t.dashboard.credits} value={f.euro(totals.credits)} />
        <StatCard
          label={t.dashboard.balance}
          value={f.euro(totals.balance)}
          tone={totals.balance < 0 ? "negative" : "positive"}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{t.dashboard.overview}</h2>
          <ArchiveToggle active={showArchived} count={hidden.length} />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? t.dashboard.emptyTitle : t.dashboard.emptyNoActive}
            description={
              all.length === 0
                ? t.dashboard.emptyHint
                : t.dashboard.emptyArchivedHint
            }
            action={
              canEdit && all.length === 0 ? (
                <ButtonLink href="/objekte/neu">{t.dashboard.newProperty}</ButtonLink>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-[30%] min-w-[240px] px-5 py-3 font-medium">
                    {t.dashboard.property}
                  </th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.dueSoFar}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.received}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.balance}</th>
                  <th className="px-5 py-3 text-right font-medium">{t.dashboard.remaining}</th>
                  <th className="px-5 py-3 font-medium">{t.dashboard.contractEnd}</th>
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
                          {t.dashboard.countProperties(items.length)}
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
                            {p.archived && <Badge>{t.dashboard.archived}</Badge>}
                            {!p.archived && p.summary.expired && <Badge>{t.dashboard.expired}</Badge>}
                            {p.summary.hasMissingRates && (
                              <Badge tone="negative">{t.dashboard.missingRate}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="tabular px-5 py-3 text-right">
                          {f.euro(p.summary.totalDue)}
                        </td>
                        <td className="tabular px-5 py-3 text-right">
                          {f.euro(p.summary.totalReceived)}
                          {p.summary.totalCredits > 0 && (
                            <span className="block text-xs text-muted">
                              {t.dashboard.creditSuffix(f.euro(p.summary.totalCredits))}
                            </span>
                          )}
                        </td>
                        <td
                          className={`tabular px-5 py-3 text-right font-medium ${
                            p.summary.balance < 0 ? "text-negative" : "text-positive"
                          }`}
                        >
                          {f.euro(p.summary.balance)}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-muted">
                          {p.summary.remainingMonths > 0
                            ? t.dashboard.months(p.summary.remainingMonths)
                            : t.common.none}
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {f.date(p.summary.contractEnd)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {p.ta24 ? (
                            <Badge tone="accent">✓</Badge>
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
                              {t.dashboard.addPayment}
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}

                    {orderedGroups.length > 1 && (
                      <tr className="border-b border-border text-muted">
                        <td className="px-5 py-2 text-right text-xs uppercase tracking-wide">
                          {t.dashboard.sumOf(location)}
                        </td>
                        <td className="tabular px-5 py-2 text-right">
                          {f.euro(groupTotals.due)}
                        </td>
                        <td className="tabular px-5 py-2 text-right">
                          {f.euro(groupTotals.received)}
                        </td>
                        <td colSpan={canEdit ? 5 : 4} />
                      </tr>
                    )}
                  </tbody>
                );
              })}

              <tfoot>
                <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                  <td className="px-5 py-3">{t.dashboard.total}</td>
                  <td className="tabular px-5 py-3 text-right">{f.euro(totals.due)}</td>
                  <td className="tabular px-5 py-3 text-right">
                    {f.euro(totals.received)}
                  </td>
                  <td
                    className={`tabular px-5 py-3 text-right ${
                      totals.balance < 0 ? "text-negative" : "text-positive"
                    }`}
                  >
                    {f.euro(totals.balance)}
                  </td>
                  <td colSpan={canEdit ? 4 : 3} />
                </tr>

                {hiddenTotals && hidden.length > 0 && (
                  <>
                    <tr className="text-muted">
                      <td className="px-5 py-2">
                        {t.dashboard.plusHidden(hidden.length)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.due)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.received)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(hiddenTotals.balance)}
                      </td>
                      <td colSpan={canEdit ? 4 : 3} />
                    </tr>
                    <tr className="border-t border-border font-medium">
                      <td className="px-5 py-2">{t.dashboard.allProperties}</td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(totals.due + hiddenTotals.due)}
                      </td>
                      <td className="tabular px-5 py-2 text-right">
                        {f.euro(totals.received + hiddenTotals.received)}
                      </td>
                      <td
                        className={`tabular px-5 py-2 text-right ${
                          totals.balance + hiddenTotals.balance < 0
                            ? "text-negative"
                            : "text-positive"
                        }`}
                      >
                        {f.euro(totals.balance + hiddenTotals.balance)}
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
