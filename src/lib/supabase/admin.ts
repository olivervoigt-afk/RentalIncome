import { createClient } from "@supabase/supabase-js";

/**
 * Client mit Service-Role-Rechten. Umgeht sämtliche RLS-Regeln und darf
 * ausschliesslich serverseitig verwendet werden (Benutzeranlage durch den
 * Administrator). Niemals in Client-Komponenten importieren.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
