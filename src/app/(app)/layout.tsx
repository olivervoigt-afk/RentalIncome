import { DictProvider } from "@/components/dict-provider";
import Nav from "@/components/nav";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const { t, locale } = await getDict();

  return (
    <DictProvider value={{ t, locale }}>
      <Nav profile={profile} t={t} locale={locale} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">
        {children}
      </main>
    </DictProvider>
  );
}
