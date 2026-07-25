import { getProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/dictionaries";
import { getAnnualIncome, type Ta24Cell } from "@/lib/queries";

const WITHOUT = "ohne";
const ALL = "alle";

const emptyCell = (): Ta24Cell => ({ count: 0, sum: 0, reductions: 0, taxable: 0 });

/** Excel erwartet im deutschen Sprachraum das Komma als Dezimalzeichen. */
function money(value: number, locale: string): string {
  const fixed = value.toFixed(2);
  return locale === "de" ? fixed.replace(".", ",") : fixed;
}

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
  if (!profile) return new Response("Nicht angemeldet", { status: 401 });

  const params = new URL(request.url).searchParams;
  const [report, { t, locale }] = await Promise.all([getAnnualIncome(), getDict()]);
  const amount = (value: number) => money(value, locale);

  const requestedLocation = params.get("standort") ?? ALL;
  const choices = [...report.locations, WITHOUT, ALL];
  const location = choices.includes(requestedLocation) ? requestedLocation : ALL;

  const rows = report.rows.filter((row) =>
    location === ALL
      ? true
      : location === WITHOUT
        ? row.location === null
        : row.location === location,
  );

  const years = report.years.filter((year) =>
    rows.some((row) => (row.byYear.get(year)?.count ?? 0) > 0),
  );

  const requestedYear = Number(params.get("jahr"));
  const single = years.includes(requestedYear) ? requestedYear : null;
  const wanted = single ? [single] : years;

  const label =
    location === ALL
      ? t.income.allLocations
      : location === WITHOUT
        ? t.income.noLocation
        : location;

  const lines: string[] = [];
  lines.push(csvRow([`${t.income.title} — ${label}`]));
  lines.push(csvRow([t.income.intro]));
  lines.push(csvRow([new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-GB")]));
  lines.push("");

  for (const year of wanted) {
    const yearRows = rows
      .filter((row) => (row.byYear.get(year)?.count ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name, locale));

    const total = emptyCell();

    lines.push(csvRow([`${t.income.year} ${year}`]));
    lines.push(
      csvRow([
        t.income.property,
        t.income.tenant,
        t.form.location,
        "Status",
        t.income.payments,
        `${t.income.received} (EUR)`,
        `${t.income.reductions} (EUR)`,
        `${t.income.taxable} (EUR)`,
      ]),
    );

    for (const row of yearRows) {
      const cell = row.byYear.get(year)!;
      total.count += cell.count;
      total.sum += cell.sum;
      total.reductions += cell.reductions;
      total.taxable += cell.taxable;

      lines.push(
        csvRow([
          row.name,
          row.tenant,
          row.location ?? "",
          row.archived ? t.income.archived : "",
          cell.count,
          amount(cell.sum),
          amount(cell.reductions),
          amount(cell.taxable),
        ]),
      );
    }

    lines.push(
      csvRow([
        fill(t.income.sumOf, { year }),
        "",
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
    const grand = emptyCell();

    lines.push(csvRow([t.income.total]));
    lines.push(
      csvRow([
        t.income.year,
        t.income.payments,
        `${t.income.received} (EUR)`,
        `${t.income.reductions} (EUR)`,
        `${t.income.taxable} (EUR)`,
      ]),
    );

    for (const year of years) {
      const cell = emptyCell();
      for (const row of rows) {
        const c = row.byYear.get(year);
        if (!c) continue;
        cell.count += c.count;
        cell.sum += c.sum;
        cell.reductions += c.reductions;
        cell.taxable += c.taxable;
      }
      grand.count += cell.count;
      grand.sum += cell.sum;
      grand.reductions += cell.reductions;
      grand.taxable += cell.taxable;

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
        t.income.total,
        grand.count,
        amount(grand.sum),
        amount(grand.reductions),
        amount(grand.taxable),
      ]),
    );
  }

  const slug = label.replace(/[^\w]+/g, "-");
  const name = single
    ? `Einnahmen-${slug}-${single}.csv`
    : `Einnahmen-${slug}.csv`;

  // Byte Order Mark, damit Excel die Umlaute richtig erkennt.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
