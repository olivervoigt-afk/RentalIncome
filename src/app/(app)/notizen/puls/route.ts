import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Kennzahl über die für den Aufrufer sichtbaren Notizen: Anzahl ungelesener
 * und Zeitpunkt der jüngsten. Ändert sich einer der beiden Werte, hat sich
 * etwas getan.
 *
 * Bewusst winzig gehalten: die Oberfläche fragt im Takt von Sekunden. Erst
 * wenn sich die Kennzahl ändert, lädt sie die eigentliche Seite neu — sonst
 * liefe alle paar Sekunden die volle Auswertung über alle Zahlungen mit.
 */
export async function GET() {
  const profile = await getProfile();
  if (!profile) return new Response("Nicht angemeldet", { status: 401 });

  const supabase = await createClient();

  const [unread, newest] = await Promise.all([
    supabase
      .from("property_notes")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .is("read_at", null),
    // Row Level Security blendet hier bereits aus, was der Aufrufer nicht
    // sehen darf — die Kennzahl verrät also nichts über fremde Notizen.
    supabase
      .from("property_notes")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return Response.json(
    {
      unread: unread.count ?? 0,
      latest: (newest.data as { created_at: string } | null)?.created_at ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
