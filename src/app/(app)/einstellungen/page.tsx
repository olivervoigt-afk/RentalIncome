import ChangePasswordForm from "@/components/change-password-form";
import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import { Badge, Card, CardHeader, Field, Input } from "@/components/ui";
import {
  addLocation,
  addPaymentSource,
  deleteLocation,
  deletePaymentSource,
} from "@/lib/actions/users";
import { requireProfile } from "@/lib/auth";
import { getLocations, getPaymentSources } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/types";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const canEdit = profile.role !== "viewer";

  const [sources, locations] = canEdit
    ? await Promise.all([getPaymentSources(), getLocations()])
    : [[], []];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>

      <Card>
        <CardHeader title="Mein Konto" />
        <dl className="space-y-3 px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Name</dt>
            <dd className="font-medium">{profile.full_name || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">E-Mail</dt>
            <dd className="font-medium">{profile.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Rolle</dt>
            <dd>
              <Badge tone="accent">{ROLE_LABELS[profile.role]}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Passwort ändern"
          description="Gilt sofort für die nächste Anmeldung."
        />
        <div className="p-5">
          <ChangePasswordForm />
        </div>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader
            title="Standorte"
            description="Auswahlmöglichkeiten im Objektformular. Das Dashboard gruppiert danach."
          />

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
                  trigger="Löschen"
                  title="Standort löschen?"
                  description={`„${location.name}" steht künftig nicht mehr zur Auswahl. Objekte mit diesem Standort behalten alle Daten und erscheinen dann unter „Ohne Standort".`}
                />
              </li>
            ))}
          </ul>

          <div className="border-t border-border bg-surface-muted/40 p-5">
            <InlineForm action={addLocation} submitLabel="Hinzufügen">
              <Field label="Neuer Standort">
                <Input name="name" required placeholder="z. B. Österreich" />
              </Field>
            </InlineForm>
          </div>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader
            title="Zahlungsquellen"
            description="Auswahlmöglichkeiten beim Erfassen eines Zahlungseingangs."
          />

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
                  trigger="Löschen"
                  title="Zahlungsquelle löschen?"
                  description={`„${source.name}" steht künftig nicht mehr zur Auswahl. Bereits erfasste Zahlungen behalten ihren Betrag, verlieren aber die Quellenangabe.`}
                />
              </li>
            ))}
          </ul>

          <div className="border-t border-border bg-surface-muted/40 p-5">
            <InlineForm action={addPaymentSource} submitLabel="Hinzufügen">
              <Field label="Neue Zahlungsquelle">
                <Input name="name" required placeholder="z. B. Überweisung Malta" />
              </Field>
            </InlineForm>
          </div>
        </Card>
      )}
    </div>
  );
}
