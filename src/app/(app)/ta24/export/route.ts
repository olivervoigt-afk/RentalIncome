import { getProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getTa24Report } from "@/lib/queries";

/** Excel erwartet im deutschen Sprachraum das Komma als Dezimalzeichen. */
function money(value: number, locale: string): string {
  const fixed = value.toFixed(2);
  return locale === "de" ? fixed.replace(".", ",") : fixed;
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
  const [report, { t, locale }] = await Promise.all([getTa24Report(), getDict()]);
  const amount = (value: number) => money(value, locale);
  const lines: string[] = [];

  const single =
    requested && report.years.includes(Number(requested)) ? Number(requested) : null;
  const years = single ? [single] : report.years;

  lines.push(csvRow([t.ta24.title]));
  lines.push(csvRow([t.ta24.intro]));
  lines.push(
    csvRow([
      new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-GB"),
    ]),
  );
  lines.push("");

  for (const year of years) {
    const rows = report.rows
      .filter((r) => (r.byYear.get(year)?.count ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    const total =
      report.totalsByYear.get(year) ?? { count: 0, sum: 0, reductions: 0, taxable: 0 };

    lines.push(csvRow([`${t.ta24.year} ${year}`]));
    lines.push(
      csvRow([
        t.ta24.property,
        t.ta24.location,
        "Status",
        t.ta24.payments,
        `${t.ta24.received} (EUR)`,
        `${t.ta24.reductions} (EUR)`,
        `${t.ta24.taxable} (EUR)`,
      ]),
    );

    for (const row of rows) {
      const cell = row.byYear.get(year)!;
      lines.push(
        csvRow([
          row.name,
          row.location ?? "",
          row.archived ? t.ta24.archived : "",
          cell.count,
          amount(cell.sum),
          amount(cell.reductions),
          amount(cell.taxable),
        ]),
      );
    }

    lines.push(
      csvRow([
        t.ta24.total,
        "",
        "",
        total.count,
        amount(total.sum),
        amount(total.reductions),
        amount(total.taxable),
      ]),
    );
    lines.push("");
  }

  if (!single) {
    lines.push(csvRow([t.ta24.allYears]));
    lines.push(
      csvRow([
        t.ta24.year,
        t.ta24.payments,
        `${t.ta24.received} (EUR)`,
        `${t.ta24.reductions} (EUR)`,
        `${t.ta24.taxable} (EUR)`,
      ]),
    );
    for (const year of report.years) {
      const cell = report.totalsByYear.get(year)!;
      lines.push(
        csvRow([
          year,
          cell.count,
          amount(cell.sum),
          amount(cell.reductions),
          amount(cell.taxable),
        ]),
      );
    }
    lines.push(
      csvRow([
        t.ta24.total,
        [...report.totalsByYear.values()].reduce((a, c) => a + c.count, 0),
        amount([...report.totalsByYear.values()].reduce((a, c) => a + c.sum, 0)),
        amount([...report.totalsByYear.values()].reduce((a, c) => a + c.reductions, 0)),
        amount(report.grandTotal),
      ]),
    );
  }

  const name = single ? `TA24-${single}.csv` : `TA24-${report.years.at(-1)}-${report.years[0]}.csv`;

  // Byte Order Mark, damit Excel die Umlaute richtig erkennt.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
