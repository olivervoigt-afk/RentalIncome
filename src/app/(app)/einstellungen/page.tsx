import ChangePasswordForm from "@/components/change-password-form";
import AdminPanel from "@/components/settings/admin-panel";
import UsersPanel from "@/components/settings/users-panel";
import TabNav from "@/components/tab-nav";
import { Badge, Card, CardHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getLocations, getPaymentSources, getProfiles } from "@/lib/queries";

export const metadata = { title: "Einstellungen" };

const TABS = ["konto", "verwaltung", "benutzer"] as const;
type Tab = (typeof TABS)[number];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireProfile();
  const { tab: requested } = await searchParams;
  const { t } = await getDict();

  const canEdit = profile.role !== "viewer";
  const isAdmin = profile.role === "admin";

  // Wer einen Reiter nicht sehen darf, landet auf dem eigenen Konto.
  const wanted = TABS.includes(requested as Tab) ? (requested as Tab) : "konto";
  const tab: Tab =
    (wanted === "verwaltung" && !canEdit) || (wanted === "benutzer" && !isAdmin)
      ? "konto"
      : wanted;

  const [locations, sources] =
    tab === "verwaltung" ? await Promise.all([getLocations(), getPaymentSources()]) : [[], []];
  const profiles = tab === "benutzer" ? await getProfiles() : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>

      <TabNav
        active={tab}
        basePath="/einstellungen"
        defaultKey="konto"
        items={[
          { key: "konto", label: t.settings.tabs.account },
          ...(canEdit ? [{ key: "verwaltung", label: t.settings.tabs.admin }] : []),
          ...(isAdmin ? [{ key: "benutzer", label: t.settings.tabs.users }] : []),
        ]}
      />

      {tab === "konto" && (
        <div className="max-w-3xl space-y-6">
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
        </div>
      )}

      {tab === "verwaltung" && (
        <div className="max-w-3xl">
          <AdminPanel t={t} locations={locations} sources={sources} />
        </div>
      )}

      {tab === "benutzer" && <UsersPanel t={t} me={profile} profiles={profiles} />}
    </div>
  );
}
