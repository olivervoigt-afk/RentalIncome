import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/confirm-button";
import DocumentsPanel from "@/components/documents-panel";
import InlineForm from "@/components/inline-form";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
} from "@/components/ui";
import {
  addCredit,
  addPayment,
  addRentPeriod,
  deleteCredit,
  deletePayment,
  deleteProperty,
  deleteRentPeriod,
  setArchived,
} from "@/lib/actions/properties";
import { getProfile } from "@/lib/auth";
import { getPaymentSources, getPropertyDetail } from "@/lib/queries";
import { formatDate, formatEuro, toISODate } from "@/lib/rent";
import { FREQUENCY_LABELS } from "@/lib/types";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile, detail, sources] = await Promise.all([
    getProfile(),
    getPropertyDetail(id),
    getPaymentSources(),
  ]);

  if (!detail) notFound();

  const { property, periods, payments, credits, documents, history, summary } = detail;
  const canEdit = profile?.role !== "viewer";
  const today = toISODate(new Date());
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      {/* Kopfbereich */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/objekte" className="text-sm text-muted hover:text-foreground">
            ← Alle Objekte
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {property.location || "Kein Standort"}
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

      {/* Kennzahlen */}
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

      <Card className="px-5 py-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Mietbeginn" value={formatDate(property.start_date)} />
          <Detail label="Vertragsende" value={formatDate(summary.contractEnd)} />
          <Detail
            label="Restlaufzeit"
            value={summary.remainingMonths > 0 ? `${summary.remainingMonths} Monate` : "Abgelaufen"}
          />
          <Detail label="Rhythmus" value={FREQUENCY_LABELS[property.payment_frequency]} />
          <Detail label="Laufzeit gesamt" value={`${property.term_months} Monate`} />
          <Detail label="Vertragsvolumen" value={formatEuro(summary.totalContract)} />
        </dl>
        {property.notes && (
          <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm text-muted">
            {property.notes}
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mietstaffel */}
        <Card>
          <CardHeader
            title="Mietstaffel"
            description="Zeiträume mit unterschiedlicher Miete. Der Betrag gilt je Zahlungszeitraum."
          />
          {periods.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">
              Noch keine Miete hinterlegt — ohne Eintrag bleibt die Forderung bei 0 €.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {periods.map((period) => (
                <li key={period.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="text-sm">
                    <p className="tabular font-medium">{formatEuro(Number(period.amount))}</p>
                    <p className="text-muted">
                      ab {formatDate(period.valid_from)}
                      {period.valid_to ? ` bis ${formatDate(period.valid_to)}` : " (offen)"}
                    </p>
                  </div>
                  {canEdit && (
                    <form action={deleteRentPeriod}>
                      <input type="hidden" name="id" value={period.id} />
                      <input type="hidden" name="property_id" value={property.id} />
                      <ConfirmButton message="Diesen Mietzeitraum löschen?">
                        Löschen
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && (
            <div className="border-t border-border bg-surface-muted/40 p-5">
              <InlineForm action={addRentPeriod} submitLabel="Zeitraum hinzufügen">
                <input type="hidden" name="property_id" value={property.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Gültig ab">
                    <Input name="valid_from" type="date" required defaultValue={property.start_date} />
                  </Field>
                  <Field label="Gültig bis">
                    <Input name="valid_to" type="date" />
                  </Field>
                  <Field label="Betrag (€)">
                    <Input name="amount" inputMode="decimal" required placeholder="1250,00" />
                  </Field>
                </div>
              </InlineForm>
            </div>
          )}
        </Card>

        {/* Gutschriften */}
        <Card>
          <CardHeader
            title="Gutschriften"
            description="Beträge, die dem Mieter angerechnet werden, z. B. selbst bezahlte Handwerker."
          />
          {credits.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Keine Gutschriften erfasst.</p>
          ) : (
            <ul className="divide-y divide-border">
              {credits.map((credit) => (
                <li key={credit.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="text-sm">
                    <p className="tabular font-medium">{formatEuro(Number(credit.amount))}</p>
                    <p className="text-muted">
                      {formatDate(credit.credited_on)}
                      {credit.reason && ` · ${credit.reason}`}
                    </p>
                  </div>
                  {canEdit && (
                    <form action={deleteCredit}>
                      <input type="hidden" name="id" value={credit.id} />
                      <input type="hidden" name="property_id" value={property.id} />
                      <ConfirmButton message="Diese Gutschrift löschen?">Löschen</ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && (
            <div className="border-t border-border bg-surface-muted/40 p-5">
              <InlineForm action={addCredit} submitLabel="Gutschrift erfassen">
                <input type="hidden" name="property_id" value={property.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Datum">
                    <Input name="credited_on" type="date" required defaultValue={today} />
                  </Field>
                  <Field label="Betrag (€)">
                    <Input name="amount" inputMode="decimal" required />
                  </Field>
                  <Field label="Grund">
                    <Input name="reason" placeholder="z. B. Sanitär-Reparatur" />
                  </Field>
                </div>
              </InlineForm>
            </div>
          )}
        </Card>
      </div>

      {/* Zahlungen */}
      <Card>
        <CardHeader
          title="Zahlungseingänge"
          description={`${payments.length} ${payments.length === 1 ? "Eintrag" : "Einträge"}`}
        />
        {payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">Noch keine Zahlungen erfasst.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Zahlungsdatum</th>
                  <th className="px-5 py-3 text-right font-medium">Betrag</th>
                  <th className="px-5 py-3 font-medium">Quelle</th>
                  <th className="px-5 py-3 font-medium">Notiz</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/60 last:border-0">
                    <td className="tabular px-5 py-3">{formatDate(payment.paid_on)}</td>
                    <td className="tabular px-5 py-3 text-right font-medium">
                      {formatEuro(Number(payment.amount))}
                    </td>
                    <td className="px-5 py-3">
                      {payment.source_id ? (
                        <Badge>{sourceName.get(payment.source_id) ?? "Unbekannt"}</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{payment.note || "—"}</td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <form action={deletePayment}>
                          <input type="hidden" name="id" value={payment.id} />
                          <input type="hidden" name="property_id" value={property.id} />
                          <ConfirmButton message="Diese Zahlung löschen?">Löschen</ConfirmButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEdit && (
          <div className="border-t border-border bg-surface-muted/40 p-5">
            <InlineForm action={addPayment} submitLabel="Zahlung erfassen">
              <input type="hidden" name="property_id" value={property.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Zahlungsdatum">
                  <Input name="paid_on" type="date" required defaultValue={today} />
                </Field>
                <Field label="Betrag (€)">
                  <Input name="amount" inputMode="decimal" required placeholder="1250,00" />
                </Field>
                <Field label="Quelle">
                  <Select name="source_id" defaultValue={sources[0]?.id ?? ""}>
                    <option value="">Ohne Angabe</option>
                    {sources
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Notiz">
                  <Input name="note" />
                </Field>
              </div>
            </InlineForm>
          </div>
        )}
      </Card>

      <DocumentsPanel
        propertyId={property.id}
        documents={documents}
        canEdit={canEdit}
      />

      {/* Vertragshistorie */}
      {history.length > 0 && (
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

      {canEdit && (
        <Card className="border-negative/30 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Objekt löschen</p>
              <p className="text-sm text-muted">
                Entfernt das Objekt samt Mietstaffel, Zahlungen und Gutschriften
                unwiderruflich. Zum reinen Ausblenden bitte archivieren.
              </p>
            </div>
            <form action={deleteProperty}>
              <input type="hidden" name="id" value={property.id} />
              <ConfirmButton
                message={`"${property.name}" endgültig löschen? Alle Zahlungen und Gutschriften gehen verloren.`}
                className="rounded-md border border-border px-3.5 py-2 font-medium"
              >
                Endgültig löschen
              </ConfirmButton>
            </form>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
