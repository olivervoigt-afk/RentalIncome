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
import { getDict } from "@/lib/i18n";
import { getLocations, getPaymentSources } from "@/lib/queries";
import { fill } from "@/lib/i18n/dictionaries";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const canEdit = profile.role !== "viewer";

  const { t } = await getDict();
  const [sources, locations] = canEdit
    ? await Promise.all([getPaymentSources(), getLocations()])
    : [[], []];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>

      <Card>
        <CardHeader title={t.settings.account} />
        <dl className="space-y-3 px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t.settings.name}</dt>
            <dd className="font-medium">{profile.full_name || t.common.none}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t.settings.email}</dt>
            <dd className="font-medium">{profile.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t.settings.role}</dt>
            <dd>
              <Badge tone="accent">{t.roles[profile.role]}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader
          title={t.settings.changePassword}
          description={t.settings.changePasswordHint}
        />
        <div className="p-5">
          <ChangePasswordForm />
        </div>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader
            title={t.settings.locations}
            description={t.settings.locationsHint}
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
      )}

      {canEdit && (
        <Card>
          <CardHeader
            title={t.settings.sources}
            description={t.settings.sourcesHint}
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
      )}
    </div>
  );
}
