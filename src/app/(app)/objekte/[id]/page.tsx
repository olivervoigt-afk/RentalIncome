import Link from "next/link";
import { notFound } from "next/navigation";
import DangerAction from "@/components/danger-action";
import DocumentsPanel from "@/components/documents-panel";
import CreditsTab from "@/components/property/credits-tab";
import OverviewTab from "@/components/property/overview-tab";
import PaymentsTab, { type PaymentsView } from "@/components/property/payments-tab";
import TabNav from "@/components/tab-nav";
import { Badge, Button, ButtonLink, Card, CardHeader } from "@/components/ui";
import { deleteProperty, setArchived } from "@/lib/actions/properties";
import { getProfile } from "@/lib/auth";
import { getPaymentSources, getPropertyDetail } from "@/lib/queries";
import { formatDate, formatEuro } from "@/lib/rent";

const TABS = ["uebersicht", "zahlungen", "gutschriften", "dokumente", "historie"] as const;
type Tab = (typeof TABS)[number];

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    ansicht?: string;
    jahr?: string;
    seite?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const [profile, detail, sources] = await Promise.all([
    getProfile(),
    getPropertyDetail(id),
    getPaymentSources(),
  ]);

  if (!detail) notFound();

  const { property, location, periods, payments, credits, documents, history, summary } =
    detail;
  const canEdit = profile?.role !== "viewer";

  const tab: Tab = TABS.includes(query.tab as Tab) ? (query.tab as Tab) : "uebersicht";
  const view: PaymentsView = query.ansicht === "soll" ? "soll" : "eingaenge";
  const year = query.jahr ?? String(new Date().getFullYear());
  const page = Number(query.seite) || 1;

  return (
    <div className="space-y-6">
      {/* Kopfbereich — bleibt über allen Tabs gleich */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Zum Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {location ?? "Kein Standort"}
            {property.tenant_name && ` · Mieter: ${property.tenant_name}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {property.ta24 && <Badge tone="accent">TA24</Badge>}
            {property.archived && <Badge>Archiviert</Badge>}
            {summary.expired && <Badge>Vertrag abgelaufen</Badge>}
            {summary.hasMissingRates && (
              <Badge tone="negative">Für manche Termine fehlt eine Miete</Badge>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <ButtonLink href={`/objekte/${property.id}?tab=zahlungen`}>
              Zahlung erfassen
            </ButtonLink>
            <ButtonLink href={`/objekte/${property.id}/bearbeiten`} variant="secondary">
              Bearbeiten
            </ButtonLink>
            <form action={setArchived}>
              <input type="hidden" name="id" value={property.id} />
              <input type="hidden" name="archived" value={property.archived ? "0" : "1"} />
              <Button type="submit" variant="secondary">
                {property.archived ? "Aus Archiv holen" : "Archivieren"}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Kennzahlen — ebenfalls immer sichtbar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Fällig bisher" value={formatEuro(summary.totalDue)} />
        <Stat label="Erhalten" value={formatEuro(summary.totalReceived)} />
        <Stat label="Gutschriften" value={formatEuro(summary.totalCredits)} />
        <Stat
          label="Saldo"
          value={formatEuro(summary.balance)}
          tone={summary.balance < 0 ? "negative" : "positive"}
          hint={summary.balance < 0 ? "Rückstand" : "Ausgeglichen bzw. im Voraus"}
        />
      </div>

      <TabNav
        active={tab}
        basePath={`/objekte/${property.id}`}
        items={[
          { key: "uebersicht", label: "Übersicht" },
          { key: "zahlungen", label: "Zahlungen", count: payments.length },
          { key: "gutschriften", label: "Gutschriften", count: credits.length },
          { key: "dokumente", label: "Dokumente", count: documents.length },
          ...(history.length > 0
            ? [{ key: "historie", label: "Historie", count: history.length }]
            : []),
        ]}
      />

      {tab === "uebersicht" && (
        <OverviewTab
          property={property}
          periods={periods}
          summary={summary}
          canEdit={canEdit}
        />
      )}

      {tab === "zahlungen" && (
        <PaymentsTab
          property={property}
          periods={periods}
          payments={payments}
          sources={sources}
          canEdit={canEdit}
          view={view}
          year={year}
          page={page}
        />
      )}

      {tab === "gutschriften" && (
        <CreditsTab propertyId={property.id} credits={credits} canEdit={canEdit} />
      )}

      {tab === "dokumente" && (
        <DocumentsPanel
          propertyId={property.id}
          documents={documents}
          canEdit={canEdit}
        />
      )}

      {tab === "historie" && (
        <Card>
          <CardHeader
            title="Vertragshistorie"
            description="Änderungen an Mietbeginn und Laufzeit."
          />
          <ul className="divide-y divide-border">
            {history.map((entry) => (
              <li key={entry.id} className="px-5 py-3 text-sm">
                <span className="text-muted">
                  {new Date(entry.changed_at).toLocaleString("de-DE")} ·{" "}
                </span>
                {entry.old_start_date !== entry.new_start_date && (
                  <span>
                    Beginn {formatDate(entry.old_start_date!)} →{" "}
                    <strong>{formatDate(entry.new_start_date!)}</strong>{" "}
                  </span>
                )}
                {entry.old_term_months !== entry.new_term_months && (
                  <span>
                    Laufzeit {entry.old_term_months} →{" "}
                    <strong>{entry.new_term_months} Monate</strong>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canEdit && tab === "uebersicht" && (
        <Card className="border-negative/30 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Objekt löschen</p>
              <p className="text-sm text-muted">
                Entfernt das Objekt samt Mietstaffel, Zahlungen und Gutschriften
                unwiderruflich. Zum reinen Ausblenden bitte archivieren.
              </p>
            </div>
            <DangerAction
              action={deleteProperty}
              fields={{ id: property.id }}
              trigger="Endgültig löschen"
              triggerClassName="rounded-md border border-negative/40 px-3.5 py-2 text-sm font-medium text-negative transition-colors hover:bg-negative/10"
              title={`${property.name} löschen?`}
              description={`Das Objekt wird mit ${payments.length} Zahlungen, ${credits.length} Gutschriften, der kompletten Mietstaffel und allen Dokumenten entfernt.`}
              confirmWord={property.name}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  hint?: string;
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
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
