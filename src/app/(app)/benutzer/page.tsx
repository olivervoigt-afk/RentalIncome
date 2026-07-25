import { redirect } from "next/navigation";
import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import RoleSelect from "@/components/role-select";
import ResetPasswordForm from "@/components/reset-password-form";
import { Badge, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { createUser, deleteUser } from "@/lib/actions/users";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getProfiles } from "@/lib/queries";
import { fill, plural } from "@/lib/i18n/dictionaries";

export const metadata = { title: "Benutzer" };

export default async function UsersPage() {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/");

  const [profiles, { t }] = await Promise.all([getProfiles(), getDict()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.users.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {t.users.intro}
        </p>
      </div>

      <Card>
        <CardHeader title={t.users.accounts} description={fill(t.users.count, { n: profiles.length })} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">{t.users.name}</th>
                <th className="px-5 py-3 font-medium">{t.users.email}</th>
                <th className="px-5 py-3 font-medium">{t.users.role}</th>
                <th className="px-5 py-3 font-medium">{t.users.resetPassword}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3 font-medium">
                    {profile.full_name || t.common.none}
                    {profile.id === me.id && (
                      <Badge tone="accent">
                        <span className="ml-1">{t.users.you}</span>
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted">{profile.email}</td>
                  <td className="px-5 py-3">
                    {profile.id === me.id ? (
                      <span>{t.roles[profile.role]}</span>
                    ) : (
                      <RoleSelect id={profile.id} role={profile.role} />
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <ResetPasswordForm id={profile.id} name={profile.full_name} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {profile.id !== me.id && (
                      <DangerAction
                        action={deleteUser}
                        fields={{ id: profile.id }}
                        trigger={t.common.delete}
                        title={t.users.deleteTitle}
                        description={fill(t.users.deleteDetail, { name: profile.full_name || profile.email })}
                      />
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
          title={t.users.createTitle}
          description={t.users.createHint}
        />
        <div className="p-5">
          <InlineForm action={createUser} submitLabel={t.users.create}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.users.fullName}>
                <Input name="full_name" required />
              </Field>
              <Field label={t.users.email}>
                <Input name="email" type="email" required />
              </Field>
              <Field label={t.users.basePassword} hint={t.users.minChars}>
                <Input name="password" type="text" required minLength={8} />
              </Field>
              <Field label={t.users.role}>
                <Select name="role" defaultValue="viewer">
                  <option value="viewer">{t.roles.viewer}</option>
                  <option value="editor">{t.roles.editor}</option>
                  <option value="admin">{t.roles.admin}</option>
                </Select>
              </Field>
            </div>
          </InlineForm>
        </div>
      </Card>
    </div>
  );
}
