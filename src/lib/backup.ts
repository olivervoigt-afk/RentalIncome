import { createClient } from "./supabase/server";
import type { Property } from "./types";

/**
 * Erzeugt denselben Satz Dateien wie das Sicherungsskript, nur für den
 * Abruf aus der Anwendung heraus.
 *
 * Gelesen wird mit den Rechten des angemeldeten Benutzers. Die Leserechte
 * gelten für alle Rollen, deshalb ist der Dienstschlüssel hier nicht nötig.
 */
const TABLES: [table: string, file: string][] = [
  ["properties", "objekte"],
  ["rent_periods", "mietstaffel"],
  ["payments", "zahlungen"],
  ["credits", "gutschriften"],
  ["locations", "standorte"],
  ["payment_sources", "zahlungsquellen"],
  ["property_documents", "dokumente"],
  ["contract_history", "vertragshistorie"],
  ["profiles", "benutzer"],
];

type Row = Record<string, unknown>;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  // Zahlen mit Komma, damit Excel im deutschen Sprachraum rechnen kann.
  const text =
    typeof value === "number"
      ? String(value).replace(".", ",")
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Row[], nameOf: Map<string, string>): string {
  if (rows.length === 0) return "";

  const withProperty = "property_id" in rows[0];
  const columns = [...Object.keys(rows[0]), ...(withProperty ? ["objekt"] : [])];

  const lines = [columns.join(";")];
  for (const row of rows) {
    lines.push(
      columns
        .map((c) =>
          c === "objekt" && withProperty
            ? csvCell(nameOf.get(String(row.property_id)) ?? "")
            : csvCell(row[c]),
        )
        .join(";"),
    );
  }

  // Byte Order Mark, damit Excel die Umlaute richtig erkennt.
  return "﻿" + lines.join("\r\n");
}

export async function buildBackupFiles(): Promise<{
  files: Record<string, Uint8Array>;
  counts: { table: string; rows: number }[];
}> {
  const supabase = await createClient();
  const encoder = new TextEncoder();

  async function fetchAll(table: string): Promise<Row[]> {
    const size = 1000;
    const rows: Row[] = [];

    for (let from = 0; ; from += size) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + size - 1);

      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...((data ?? []) as Row[]));
      if (!data || data.length < size) return rows;
    }
  }

  // Objekte zuerst, damit die übrigen Dateien den Namen mitführen können.
  const properties = (await fetchAll("properties")) as unknown as Property[];
  const nameOf = new Map(properties.map((p) => [p.id, p.name]));

  const files: Record<string, Uint8Array> = {};
  const everything: Record<string, Row[]> = {};
  const counts: { table: string; rows: number }[] = [];

  for (const [table, file] of TABLES) {
    const rows =
      table === "properties" ? (properties as unknown as Row[]) : await fetchAll(table);

    everything[table] = rows;
    counts.push({ table, rows: rows.length });
    files[`${file}.csv`] = encoder.encode(toCsv(rows, nameOf));
  }

  files["vollstaendig.json"] = encoder.encode(
    JSON.stringify({ erstellt: new Date().toISOString(), daten: everything }, null, 1),
  );

  files["LIESMICH.txt"] = encoder.encode(
    [
      `Datensicherung Oylio Rental Dashboard vom ${new Date().toISOString().slice(0, 10)}`,
      "",
      ...counts.map((c) => `${c.table.padEnd(20)} ${String(c.rows).padStart(6)} Zeilen`),
      "",
      "Die CSV-Dateien lassen sich in Excel öffnen (Semikolon als Trennzeichen,",
      "Komma als Dezimalzeichen). Zeilen mit Objektbezug führen den Objektnamen",
      "in der letzten Spalte mit.",
      "",
      "vollstaendig.json enthält dieselben Daten mit Rohwerten und dient dem",
      "vollständigen Zurückspielen.",
    ].join("\n"),
  );

  return { files, counts };
}
