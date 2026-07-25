import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import ArchiveToggle from "@/components/archive-toggle";
import { getProfile } from "@/lib/auth";
import { getPropertiesWithSummary } from "@/lib/queries";
import { formatDate, formatEuro } from "@/lib/rent";

export const metadata = { title: "Dashboard — RentalIncome" };

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

  const totals = rows.reduce(
    (acc, p) => ({
      due: acc.due + p.summary.totalDue,
      received: acc.received + p.summary.totalReceived,
      credits: acc.credits + p.summary.totalCredits,
      balance: acc.balance + p.summary.balance,
    }),
    { due: 0, received: 0, credits: 0, balance: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? "Objekt" : "Objekte"}
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
                ? "Lege dein erstes Objekt an oder importiere eine bestehende Liste."
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
                  <th className="px-5 py-3 font-medium">Objekt</th>
                  <th className="px-5 py-3 font-medium">Standort</th>
                  <th className="px-5 py-3 text-right font-medium">Fällig bisher</th>
                  <th className="px-5 py-3 text-right font-medium">Erhalten</th>
                  <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  <th className="px-5 py-3 text-right font-medium">Restlaufzeit</th>
                  <th className="px-5 py-3 font-medium">Vertragsende</th>
                  <th className="px-5 py-3 text-center font-medium">TA24</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/objekte/${p.id}`}
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {p.archived && <Badge>Archiviert</Badge>}
                        {!p.archived && p.summary.expired && <Badge>Abgelaufen</Badge>}
                        {p.summary.hasMissingRates && (
                          <Badge tone="negative">Miete fehlt</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.location || "—"}</td>
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
                      {p.ta24 ? <Badge tone="accent">Ja</Badge> : <span className="text-muted">—</span>}
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/objekte/${p.id}#zahlungen`}
                          className="whitespace-nowrap text-sm text-accent hover:underline"
                        >
                          + Zahlung
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                  <td className="px-5 py-3" colSpan={2}>
                    Gesamt
                  </td>
                  <td className="tabular px-5 py-3 text-right">{formatEuro(totals.due)}</td>
                  <td className="tabular px-5 py-3 text-right">{formatEuro(totals.received)}</td>
                  <td
                    className={`tabular px-5 py-3 text-right ${
                      totals.balance < 0 ? "text-negative" : "text-positive"
                    }`}
                  >
                    {formatEuro(totals.balance)}
                  </td>
                  <td colSpan={canEdit ? 4 : 3} />
                </tr>
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
