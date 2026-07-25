import { redirect } from "next/navigation";
import ConfirmButton from "@/components/confirm-button";
import InlineForm from "@/components/inline-form";
import RoleSelect from "@/components/role-select";
import ResetPasswordForm from "@/components/reset-password-form";
import { Badge, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { createUser, deleteUser } from "@/lib/actions/users";
import { requireProfile } from "@/lib/auth";
import { getProfiles } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/types";

export const metadata = { title: "Benutzer — RentalIncome" };

export default async function UsersPage() {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/");

  const profiles = await getProfiles();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Benutzer</h1>
        <p className="mt-1 text-sm text-muted">
          Administratoren verwalten alles, Bearbeiter pflegen Objekte und
          Zahlungen, Leser haben nur Einsicht.
        </p>
      </div>

      <Card>
        <CardHeader title="Konten" description={`${profiles.length} Benutzer`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">E-Mail</th>
                <th className="px-5 py-3 font-medium">Rolle</th>
                <th className="px-5 py-3 font-medium">Passwort zurücksetzen</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3 font-medium">
                    {profile.full_name || "—"}
                    {profile.id === me.id && (
                      <Badge tone="accent">
                        <span className="ml-1">Du</span>
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted">{profile.email}</td>
                  <td className="px-5 py-3">
                    {profile.id === me.id ? (
                      <span>{ROLE_LABELS[profile.role]}</span>
                    ) : (
                      <RoleSelect id={profile.id} role={profile.role} />
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <ResetPasswordForm id={profile.id} name={profile.full_name} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {profile.id !== me.id && (
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={profile.id} />
                        <ConfirmButton
                          message={`Konto von ${profile.full_name || profile.email} löschen?`}
                        >
                          Löschen
                        </ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Benutzer anlegen"
          description="Der Benutzer meldet sich mit dem Basispasswort an und kann es danach selbst ändern."
        />
        <div className="p-5">
          <InlineForm action={createUser} submitLabel="Benutzer anlegen">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vollständiger Name">
                <Input name="full_name" required />
              </Field>
              <Field label="E-Mail-Adresse">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Basispasswort" hint="Mindestens 8 Zeichen.">
                <Input name="password" type="text" required minLength={8} />
              </Field>
              <Field label="Rolle">
                <Select name="role" defaultValue="viewer">
                  <option value="viewer">Leser</option>
                  <option value="editor">Bearbeiter</option>
                  <option value="admin">Administrator</option>
                </Select>
              </Field>
            </div>
          </InlineForm>
        </div>
      </Card>
    </div>
  );
}
