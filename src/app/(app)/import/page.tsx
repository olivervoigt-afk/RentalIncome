import { redirect } from "next/navigation";
import ImportWizard from "@/components/import-wizard";
import { Card, CardHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Import — RentalIncome" };

export default async function ImportPage() {
  const profile = await requireProfile();
  if (profile.role === "viewer") redirect("/");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daten importieren</h1>
        <p className="mt-1 text-sm text-muted">
          Bestehende Objektlisten aus Excel oder Google Sheets übernehmen.
        </p>
      </div>

      <Card>
        <CardHeader title="So bereitest du die Datei vor" />
        <div className="space-y-3 px-5 py-4 text-sm text-muted">
          <p>
            <strong className="text-foreground">Excel:</strong> Datei → Speichern
            unter → Format <em>CSV UTF-8 (durch Trennzeichen getrennt)</em>.
          </p>
          <p>
            <strong className="text-foreground">Google Sheets:</strong> Datei →
            Herunterladen → <em>Komma-getrennte Werte (.csv)</em>.
          </p>
          <p>
            Die erste Zeile muss die Spaltenüberschriften enthalten. Welche Spalte
            wofür steht, ordnest du im nächsten Schritt selbst zu — die Bezeichnungen
            sind also frei.
          </p>
          <p>
            Datumsangaben werden als <code>31.12.2024</code> oder{" "}
            <code>2024-12-31</code> erkannt, Beträge als <code>1.250,50</code> oder{" "}
            <code>1250.50</code>.
          </p>
        </div>
      </Card>

      <ImportWizard />
    </div>
  );
}
