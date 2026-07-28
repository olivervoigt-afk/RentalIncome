import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import { ButtonLink, Card, CardHeader, Field, Input } from "@/components/ui";
import {
  addLocation,
  addPaymentSource,
  deleteLocation,
  deletePaymentSource,
} from "@/lib/actions/users";
import { fill, type Dict } from "@/lib/i18n/dictionaries";
import type { Location, PaymentSource } from "@/lib/types";

/** Standorte, Zahlungsquellen und Datensicherung — die Stammdaten der Anwendung. */
export default function AdminPanel({
  t,
  locations,
  sources,
}: {
  t: Dict;
  locations: Location[];
  sources: PaymentSource[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t.settings.locations} description={t.settings.locationsHint} />

        <ul className="divide-y divide-border">
          {locations.map((location) => (
            <li
              key={location.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="font-medium">{location.name}</span>
              <DangerAction
                action={deleteLocation}
                fields={{ id: location.id }}
                trigger={t.common.delete}
                title={t.settings.deleteLocation}
                description={fill(t.settings.deleteLocationDetail, { name: location.name })}
              />
            </li>
          ))}
        </ul>

        <div className="border-t border-border bg-surface-muted/40 p-5">
          <InlineForm action={addLocation} submitLabel={t.common.add}>
            <Field label={t.settings.newLocation}>
              <Input name="name" required placeholder={t.settings.locationPlaceholder} />
            </Field>
          </InlineForm>
        </div>
      </Card>

      <Card>
        <CardHeader title={t.settings.sources} description={t.settings.sourcesHint} />

        <ul className="divide-y divide-border">
          {sources.map((source) => (
            <li
              key={source.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="font-medium">{source.name}</span>
              <DangerAction
                action={deletePaymentSource}
                fields={{ id: source.id }}
                trigger={t.common.delete}
                title={t.settings.deleteSource}
                description={fill(t.settings.deleteSourceDetail, { name: source.name })}
              />
            </li>
          ))}
        </ul>

        <div className="border-t border-border bg-surface-muted/40 p-5">
          <InlineForm action={addPaymentSource} submitLabel={t.common.add}>
            <Field label={t.settings.newSource}>
              <Input name="name" required placeholder={t.settings.sourcePlaceholder} />
            </Field>
          </InlineForm>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t.settings.backup}
          description={t.settings.backupHint}
          action={
            <ButtonLink
              href="/einstellungen/sicherung"
              variant="secondary"
              prefetch={false}
            >
              {t.settings.backupDownload}
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}
