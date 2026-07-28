import { DictProvider } from "@/components/dict-provider";
import LiveRefresh from "@/components/live-refresh";
import Nav from "@/components/nav";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getUnreadNoteCount } from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const [{ t, locale }, unreadNotes] = await Promise.all([
    getDict(),
    getUnreadNoteCount(),
  ]);

  return (
    <DictProvider value={{ t, locale }}>
      <LiveRefresh />
      <Nav profile={profile} t={t} locale={locale} unreadNotes={unreadNotes} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">
        {children}
      </main>
    </DictProvider>
  );
}
