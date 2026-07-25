import ChangePasswordForm from "@/components/change-password-form";
import ConfirmButton from "@/components/confirm-button";
import InlineForm from "@/components/inline-form";
import { Badge, Card, CardHeader, Field, Input } from "@/components/ui";
import { addPaymentSource, deletePaymentSource } from "@/lib/actions/users";
import { requireProfile } from "@/lib/auth";
import { getPaymentSources } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/types";

export const metadata = { title: "Einstellungen — RentalIncome" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const sources = profile.role === "admin" ? await getPaymentSources() : [];

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

      {profile.role === "admin" && (
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
                <form action={deletePaymentSource}>
                  <input type="hidden" name="id" value={source.id} />
                  <ConfirmButton
                    message={`„${source.name}" löschen? Bereits erfasste Zahlungen behalten ihren Betrag, verlieren aber die Quellenangabe.`}
                  >
                    Löschen
                  </ConfirmButton>
                </form>
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
