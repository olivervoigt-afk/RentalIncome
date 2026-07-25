import { getProfile } from "@/lib/auth";
import { getTa24Report } from "@/lib/queries";

/** Deutsches Zahlenformat für Excel: Komma als Dezimaltrennzeichen. */
function money(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** Semikolon ist das Trennzeichen, das Excel im deutschen Sprachraum erwartet. */
function csvCell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(";");
}

export async function GET(request: Request) {
  // Route Handler sind auch direkt aufrufbar, daher hier erneut prüfen.
  const profile = await getProfile();
  if (!profile) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const requested = new URL(request.url).searchParams.get("jahr");
  const report = await getTa24Report();
  const lines: string[] = [];

  const single =
    requested && report.years.includes(Number(requested)) ? Number(requested) : null;
  const years = single ? [single] : report.years;

  lines.push(csvRow(["TA24-Auswertung"]));
  lines.push(
    csvRow([
      "Grundlage: tatsächlich eingegangene Zahlungen nach Zahlungsdatum (Ist-Prinzip)",
    ]),
  );
  lines.push(csvRow([`Erstellt am ${new Date().toLocaleDateString("de-DE")}`]));
  lines.push("");

  for (const year of years) {
    const rows = report.rows
      .filter((r) => (r.byYear.get(year)?.count ?? 0) > 0)
      .sort((a, b) => (b.byYear.get(year)?.sum ?? 0) - (a.byYear.get(year)?.sum ?? 0));
    const total = report.totalsByYear.get(year) ?? { count: 0, sum: 0 };

    lines.push(csvRow([`Jahr ${year}`]));
    lines.push(csvRow(["Objekt", "Standort", "Status", "Zahlungen", "Erhalten (EUR)"]));

    for (const row of rows) {
      const cell = row.byYear.get(year)!;
      lines.push(
        csvRow([
          row.name,
          row.location ?? "",
          row.archived ? "archiviert" : "aktiv",
          cell.count,
          money(cell.sum),
        ]),
      );
    }

    lines.push(csvRow(["Summe", "", "", total.count, money(total.sum)]));
    lines.push("");
  }

  if (!single) {
    lines.push(csvRow(["Übersicht aller Jahre"]));
    lines.push(csvRow(["Jahr", "Zahlungen", "Erhalten (EUR)"]));
    for (const year of report.years) {
      const cell = report.totalsByYear.get(year)!;
      lines.push(csvRow([year, cell.count, money(cell.sum)]));
    }
    lines.push(
      csvRow([
        "Gesamt",
        [...report.totalsByYear.values()].reduce((a, c) => a + c.count, 0),
        money(report.grandTotal),
      ]),
    );
  }

  const name = single ? `TA24-${single}.csv` : "TA24-alle-Jahre.csv";

  // Byte Order Mark, damit Excel die Umlaute richtig erkennt.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
