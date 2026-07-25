import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getTa24Report } from "@/lib/queries";
import { formatEuro } from "@/lib/rent";

export const metadata = { title: "TA24" };

export default async function Ta24Page({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string }>;
}) {
  await requireProfile();

  const { jahr } = await searchParams;
  const report = await getTa24Report();

  if (report.years.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <EmptyState
            title="Keine Zahlungen auf TA24-Objekten"
            description="Sobald für ein Objekt mit TA24-Kennzeichen Zahlungen erfasst sind, erscheinen sie hier."
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
      <Header />

      {/* Überblick über alle Jahre */}
      <Card>
        <CardHeader
          title="Alle Jahre"
          description="Tatsächlich eingegangene Mieten auf Objekten mit TA24-Kennzeichen."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Jahr</th>
                <th className="px-5 py-3 text-right font-medium">Zahlungen</th>
                <th className="px-5 py-3 text-right font-medium">Erhalten</th>
                <th className="px-5 py-3" />
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
                      active ? "bg-accent/10" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium">{year}</td>
                    <td className="tabular px-5 py-3 text-right text-muted">
                      {cell.count}
                    </td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {formatEuro(cell.sum)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {active ? (
                        <span className="text-xs text-muted">wird unten gezeigt</span>
                      ) : (
                        <Link
                          href={`/ta24?jahr=${year}`}
                          className="text-sm text-accent hover:underline"
                        >
                          Aufschlüsseln
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                <td className="px-5 py-3">Gesamt</td>
                <td className="tabular px-5 py-3 text-right text-muted">
                  {[...report.totalsByYear.values()].reduce((a, c) => a + c.count, 0)}
                </td>
                <td className="tabular px-5 py-3 text-right">
                  {formatEuro(report.grandTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Aufschlüsselung des gewählten Jahres */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">
            Aufschlüsselung {selected}
            <span className="ml-2 text-sm font-normal text-muted">
              {rows.length} {rows.length === 1 ? "Objekt" : "Objekte"} · {yearTotal.count}{" "}
              {yearTotal.count === 1 ? "Zahlung" : "Zahlungen"}
            </span>
          </h2>
          <div className="flex flex-wrap gap-1">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-[40%] min-w-[240px] px-5 py-3 font-medium">Objekt</th>
                <th className="px-5 py-3 font-medium">Standort</th>
                <th className="px-5 py-3 text-right font-medium">Zahlungen</th>
                <th className="px-5 py-3 text-right font-medium">Erhalten {selected}</th>
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
                          <Badge>Archiviert</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{row.location ?? "—"}</td>
                    <td className="tabular px-5 py-3 text-right text-muted">{cell.count}</td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {formatEuro(cell.sum)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-muted/50 font-medium">
                <td className="px-5 py-3" colSpan={2}>
                  Summe {selected}
                </td>
                <td className="tabular px-5 py-3 text-right text-muted">
                  {yearTotal.count}
                </td>
                <td className="tabular px-5 py-3 text-right text-lg">
                  {formatEuro(yearTotal.sum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">TA24-Auswertung</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Grundlage sind die <strong>tatsächlich eingegangenen Zahlungen</strong> nach
        ihrem Zahlungsdatum, nicht die Fälligkeit. Eine Dezembermiete, die im Januar
        eingeht, zählt daher zum Januar-Jahr. Berücksichtigt sind alle Objekte mit
        TA24-Kennzeichen, auch archivierte. Gutschriften bleiben aussen vor, da ihnen
        kein Geldeingang gegenübersteht.
      </p>
    </div>
  );
}
