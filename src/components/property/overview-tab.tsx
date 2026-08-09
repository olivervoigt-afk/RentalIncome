import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import { Card, CardHeader, Field, Input } from "@/components/ui";
import { addRentPeriod, deleteRentPeriod } from "@/lib/actions/properties";
import type { Formatters } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { PropertySummary } from "@/lib/rent";
import type { Property, RentPeriod } from "@/lib/types";
import { fill } from "@/lib/i18n/dictionaries";

export default function OverviewTab({
  t,
  f,
  property,
  periods,
  summary,
  canEdit,
}: {
  t: Dict;
  f: Formatters;
  property: Property;
  periods: RentPeriod[];
  summary: PropertySummary;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card className="px-5 py-4">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={t.property.start} value={f.date(property.start_date)} />
          <Detail label={t.property.end} value={f.date(summary.contractEnd)} />
          <Detail
            label={t.property.remaining}
            value={
              summary.remainingMonths > 0
                ? fill(t.property.remainingMonths, { n: summary.remainingMonths })
                : t.property.expired
            }
          />
          <Detail label={t.property.termTotal} value={fill(t.property.termMonths, { n: property.term_months })} />
          <Detail
            label={t.property.frequency}
            value={t.frequency[property.payment_frequency]}
          />
          <Detail label={t.property.volume} value={f.euro(summary.totalContract)} />
          {/* Nur zeigen, wenn es die Umstellung gab — sonst wäre es eine
              leere Zeile für einen Sonderfall. */}
          {property.due_day_from && (
            <Detail
              label={t.property.dueFrom}
              value={f.date(property.due_day_from)}
            />
          )}
        </dl>

        {property.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-muted">{t.property.notes}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{property.notes}</p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t.property.rentSteps}
          description={t.property.rentStepsHint}
        />

        {periods.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            {t.property.noRent}
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
                    {f.euro(Number(period.amount))}
                  </p>
                  <p className="text-muted">
                    {period.valid_to
                      ? fill(t.property.fromTo, { from: f.date(period.valid_from), to: f.date(period.valid_to) })
                      : fill(t.property.fromOpen, { from: f.date(period.valid_from) })}
                  </p>
                </div>
                {canEdit && (
                  <DangerAction
                    action={deleteRentPeriod}
                    fields={{ id: period.id, property_id: property.id }}
                    trigger={t.common.delete}
                    title={t.property.rentSteps}
                    description={`${f.euro(Number(period.amount))} — ${fill(t.property.fromOpen, { from: f.date(period.valid_from) })}`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <div className="border-t border-border bg-surface-muted/40 p-5">
            <InlineForm action={addRentPeriod} submitLabel={t.property.addPeriod}>
              <input type="hidden" name="property_id" value={property.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t.property.validFrom}>
                  <Input
                    name="valid_from"
                    type="date"
                    required
                    defaultValue={property.start_date}
                  />
                </Field>
                <Field label={t.property.validTo} hint={t.property.openEnd}>
                  <Input name="valid_to" type="date" />
                </Field>
                <Field label={t.common.amount}>
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
