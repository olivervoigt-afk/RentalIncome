import { Suspense } from "react";
import { getDict } from "@/lib/i18n";
import LoginForm from "./login-form";

export const metadata = { title: "Anmelden" };

export default async function LoginPage() {
  const { t } = await getDict();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t.app.name}</h1>
          <p className="mt-1 text-sm text-muted">{t.app.tagline}</p>
        </div>
        <Suspense>
          <LoginForm t={t} />
        </Suspense>
      </div>
    </main>
  );
}
