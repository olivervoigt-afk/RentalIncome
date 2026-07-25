import Link from "next/link";
import ArchiveToggle from "@/components/archive-toggle";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getPropertiesWithSummary } from "@/lib/queries";
import { formatDate, formatEuro } from "@/lib/rent";
import { FREQUENCY_LABELS } from "@/lib/types";

export const metadata = { title: "Objekte" };

export default async function PropertiesPage({
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objekte</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? "Objekt" : "Objekte"}
            {hidden.length > 0 && !showArchived && (
              <> · {hidden.length} archiviert oder abgelaufen</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ArchiveToggle active={showArchived} count={hidden.length} />
          {canEdit && <ButtonLink href="/objekte/neu">Objekt anlegen</ButtonLink>}
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title={all.length === 0 ? "Noch keine Objekte" : "Keine aktiven Objekte"}
            description={
              all.length === 0
                ? "Lege dein erstes Objekt an oder importiere eine bestehende Liste."
                : "Blende das Archiv ein, um abgelaufene und archivierte Objekte zu sehen."
            }
            action={
              canEdit && all.length === 0 ? (
                <ButtonLink href="/objekte/neu">Objekt anlegen</ButtonLink>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <Link key={p.id} href={`/objekte/${p.id}`} className="group">
              <Card className="h-full p-5 transition-colors group-hover:border-accent/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold group-hover:text-accent">
                      {p.name}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {p.location || "Kein Standort"}
                      {p.tenant_name && ` · ${p.tenant_name}`}
                    </p>
                  </div>
                  {p.ta24 && <Badge tone="accent">TA24</Badge>}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.archived && <Badge>Archiviert</Badge>}
                  {!p.archived && p.summary.expired && <Badge>Abgelaufen</Badge>}
                  {p.summary.hasMissingRates && (
                    <Badge tone="negative">Miete fehlt</Badge>
                  )}
                  <Badge>{FREQUENCY_LABELS[p.payment_frequency]}</Badge>
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Saldo</dt>
                    <dd
                      className={`tabular font-medium ${
                        p.summary.balance < 0 ? "text-negative" : "text-positive"
                      }`}
                    >
                      {formatEuro(p.summary.balance)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Erhalten</dt>
                    <dd className="tabular">{formatEuro(p.summary.totalReceived)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Vertragsende</dt>
                    <dd className="tabular">{formatDate(p.summary.contractEnd)}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
