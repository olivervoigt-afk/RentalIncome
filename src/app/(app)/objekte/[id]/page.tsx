import Link from "next/link";
import { notFound } from "next/navigation";
import DangerAction from "@/components/danger-action";
import DocumentsPanel from "@/components/documents-panel";
import CreditsTab from "@/components/property/credits-tab";
import NotesTab from "@/components/property/notes-tab";
import OverviewTab from "@/components/property/overview-tab";
import PaymentsTab, { type PaymentsView } from "@/components/property/payments-tab";
import TabNav from "@/components/tab-nav";
import { Badge, Button, ButtonLink, Card, CardHeader } from "@/components/ui";
import { deleteProperty, setArchived } from "@/lib/actions/properties";
import { getProfile } from "@/lib/auth";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import {
  getPaymentSources,
  getProfiles,
  getPropertyDetail,
  getPropertyNotes,
} from "@/lib/queries";
import { fill } from "@/lib/i18n/dictionaries";

const TABS = [
  "uebersicht",
  "zahlungen",
  "gutschriften",
  "dokumente",
  "notizen",
  "historie",
] as const;
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

  const [profile, detail, sources, notes, people, { t, locale }] = await Promise.all([
    getProfile(),
    getPropertyDetail(id),
    getPaymentSources(),
    getPropertyNotes(id),
    getProfiles(),
    getDict(),
  ]);
  const f = formatters(locale);

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
            {t.property.backToDashboard}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {location ?? t.property.noLocation}
            {property.tenant_name && fill(t.property.tenantPrefix, { name: property.tenant_name })}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {property.ta24 && <Badge tone="accent">TA24</Badge>}
            {property.archived && <Badge>{t.dashboard.archived}</Badge>}
            {summary.expired && <Badge>{t.property.contractExpired}</Badge>}
            {summary.hasMissingRates && (
              <Badge tone="negative">{t.property.missingRates}</Badge>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <ButtonLink href={`/objekte/${property.id}?tab=zahlungen`}>
              {t.property.recordPayment}
            </ButtonLink>
            <ButtonLink href={`/objekte/${property.id}/bearbeiten`} variant="secondary">
              {t.common.edit}
            </ButtonLink>
            <form action={setArchived}>
              <input type="hidden" name="id" value={property.id} />
              <input type="hidden" name="archived" value={property.archived ? "0" : "1"} />
              <Button type="submit" variant="secondary">
                {property.archived ? t.property.unarchive : t.property.archive}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Kennzahlen — ebenfalls immer sichtbar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.dashboard.dueSoFar} value={f.euro(summary.totalDue)} />
        <Stat label={t.dashboard.received} value={f.euro(summary.totalReceived)} />
        <Stat label={t.dashboard.credits} value={f.euro(summary.totalCredits)} />
        <Stat
          label={t.dashboard.balance}
          value={f.euro(summary.balance)}
          tone={summary.balance < 0 ? "negative" : "positive"}
          hint={summary.balance < 0 ? t.property.arrears : t.property.settled}
        />
      </div>

      <TabNav
        active={tab}
        basePath={`/objekte/${property.id}`}
        items={[
          { key: "uebersicht", label: t.property.tabs.overview },
          { key: "zahlungen", label: t.property.tabs.payments, count: payments.length },
          { key: "gutschriften", label: t.property.tabs.credits, count: credits.length },
          { key: "dokumente", label: t.property.tabs.documents, count: documents.length },
          { key: "notizen", label: t.property.tabs.notes, count: notes.length },
          ...(history.length > 0
            ? [{ key: "historie", label: t.property.tabs.history, count: history.length }]
            : []),
        ]}
      />

      {tab === "uebersicht" && (
        <OverviewTab
          t={t}
          f={f}
          property={property}
          periods={periods}
          summary={summary}
          canEdit={canEdit}
        />
      )}

      {tab === "zahlungen" && (
        <PaymentsTab
          t={t}
          f={f}
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
        <CreditsTab t={t} f={f} propertyId={property.id} credits={credits} canEdit={canEdit} />
      )}

      {tab === "dokumente" && (
        <DocumentsPanel
          t={t}
          f={f}
          propertyId={property.id}
          documents={documents}
          canEdit={canEdit}
        />
      )}

      {tab === "notizen" && profile && (
        <NotesTab
          t={t}
          f={f}
          propertyId={property.id}
          notes={notes}
          people={people}
          viewerId={profile.id}
        />
      )}

      {tab === "historie" && (
        <Card>
          <CardHeader
            title={t.property.historyTitle}
            description={t.property.historyHint}
          />
          <ul className="divide-y divide-border">
            {history.map((entry) => (
              <li key={entry.id} className="px-5 py-3 text-sm">
                <span className="text-muted">
                  {f.dateTime(entry.changed_at)} ·{" "}
                </span>
                {entry.old_start_date !== entry.new_start_date && (
                  <span>
                    {fill(t.property.historyStart, { from: f.date(entry.old_start_date!) })}
                    <strong>{f.date(entry.new_start_date!)}</strong>{" "}
                  </span>
                )}
                {entry.old_term_months !== entry.new_term_months && (
                  <span>
                    {fill(t.property.historyTerm, { from: entry.old_term_months! })}
                    <strong>{fill(t.property.termMonths, { n: entry.new_term_months! })}</strong>
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
              <p className="font-medium">{t.property.deleteTitle}</p>
              <p className="text-sm text-muted">
                {t.property.deleteHint}
              </p>
            </div>
            <DangerAction
              action={deleteProperty}
              fields={{ id: property.id }}
              trigger={t.common.deleteFinally}
              triggerClassName="rounded-md border border-negative/40 px-3.5 py-2 text-sm font-medium text-negative transition-colors hover:bg-negative/10"
              title={fill(t.property.deleteQuestion, { name: property.name })}
              description={fill(t.property.deleteDetail, { payments: payments.length, credits: credits.length })}
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
