import ConfirmButton from "@/components/confirm-button";
import InlineForm from "@/components/inline-form";
import { Card, CardHeader, Field, Input } from "@/components/ui";
import { addRentPeriod, deleteRentPeriod } from "@/lib/actions/properties";
import { formatDate, formatEuro, type PropertySummary } from "@/lib/rent";
import { FREQUENCY_LABELS, type Property, type RentPeriod } from "@/lib/types";

export default function OverviewTab({
  property,
  periods,
  summary,
  canEdit,
}: {
  property: Property;
  periods: RentPeriod[];
  summary: PropertySummary;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card className="px-5 py-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Mietbeginn" value={formatDate(property.start_date)} />
          <Detail label="Vertragsende" value={formatDate(summary.contractEnd)} />
          <Detail
            label="Restlaufzeit"
            value={
              summary.remainingMonths > 0
                ? `${summary.remainingMonths} Monate`
                : "Abgelaufen"
            }
          />
          <Detail label="Laufzeit gesamt" value={`${property.term_months} Monate`} />
          <Detail
            label="Zahlungsrhythmus"
            value={FREQUENCY_LABELS[property.payment_frequency]}
          />
          <Detail label="Vertragsvolumen" value={formatEuro(summary.totalContract)} />
        </dl>

        {property.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-muted">Notizen</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{property.notes}</p>
          </div>
        )}
      </Card>

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
              <li
                key={period.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="text-sm">
                  <p className="tabular font-medium">
                    {formatEuro(Number(period.amount))}
                  </p>
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
                  <Input
                    name="valid_from"
                    type="date"
                    required
                    defaultValue={property.start_date}
                  />
                </Field>
                <Field label="Gültig bis" hint="Leer lassen für offenes Ende.">
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
    </div>
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
