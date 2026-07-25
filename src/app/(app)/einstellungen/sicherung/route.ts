import { zipSync } from "fflate";
import { getProfile } from "@/lib/auth";
import { buildBackupFiles } from "@/lib/backup";

export async function GET() {
  // Route Handler sind auch direkt aufrufbar, daher die Rolle hier erneut prüfen.
  const profile = await getProfile();
  if (!profile) return new Response("Nicht angemeldet", { status: 401 });
  if (profile.role === "viewer") {
    return new Response("Keine Berechtigung", { status: 403 });
  }

  const { files } = await buildBackupFiles();
  const stamp = new Date().toISOString().slice(0, 10);

  // Alles in einen Ordner packen, damit das Entpacken nichts verstreut.
  const tree: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    tree[`Sicherung-${stamp}/${name}`] = content;
  }

  const zip = zipSync(tree, { level: 6 });

  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Oylio-Sicherung-${stamp}.zip"`,
      "Content-Length": String(zip.length),
    },
  });
}
