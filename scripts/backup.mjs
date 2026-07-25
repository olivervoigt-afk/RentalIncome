/**
 * Sichert den kompletten Datenbestand in einen datierten Ordner.
 *
 *   npm run backup
 *
 * Es entstehen je Tabelle eine CSV-Datei zum Ansehen in Excel sowie eine
 * JSON-Datei mit den Rohwerten für ein vollständiges Zurückspielen.
 *
 * Ziel ist standardmäßig ~/Documents/RentalIncomeBackup. Dieser Ordner lässt
 * sich in den Einstellungen von Google Drive für Desktop als synchronisierter
 * Ordner hinzufügen; direkt nach ~/Library/CloudStorage zu schreiben sperrt
 * macOS für automatisierte Prozesse.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Zugangsdaten fehlen in .env.local.");
  process.exit(1);
}

const target =
  process.env.BACKUP_DIR ?? join(homedir(), "Documents", "RentalIncomeBackup");

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Holt eine Tabelle vollständig; die Schnittstelle liefert höchstens 1000 Zeilen je Anfrage. */
async function fetchAll(table) {
  const size = 1000;
  const rows = [];

  for (let from = 0; ; from += size) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

const TABLES = [
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

function csvCell(value) {
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

function toCsv(rows, extraColumns = {}) {
  if (rows.length === 0) return "";

  const columns = [...Object.keys(rows[0]), ...Object.keys(extraColumns)];
  const lines = [columns.join(";")];

  for (const row of rows) {
    lines.push(
      columns
        .map((c) => csvCell(c in extraColumns ? extraColumns[c](row) : row[c]))
        .join(";"),
    );
  }

  return "﻿" + lines.join("\r\n");
}

const stamp = new Date().toISOString().slice(0, 10);
const dir = join(target, `Sicherung-${stamp}`);
mkdirSync(dir, { recursive: true });

const everything = {};
const summary = [];

// Objekte zuerst, damit die übrigen Tabellen den Namen mitführen können.
const properties = await fetchAll("properties");
const nameOf = new Map(properties.map((p) => [p.id, p.name]));

for (const [table, file] of TABLES) {
  const rows = table === "properties" ? properties : await fetchAll(table);
  everything[table] = rows;

  const extra =
    rows.length > 0 && "property_id" in rows[0]
      ? { objekt: (row) => nameOf.get(row.property_id) ?? "" }
      : {};

  writeFileSync(join(dir, `${file}.csv`), toCsv(rows, extra), "utf8");
  summary.push({ tabelle: table, zeilen: rows.length });
}

writeFileSync(
  join(dir, "vollstaendig.json"),
  JSON.stringify({ erstellt: new Date().toISOString(), daten: everything }, null, 1),
  "utf8",
);

writeFileSync(
  join(dir, "LIESMICH.txt"),
  [
    `Datensicherung Oylio Rental Dashboard vom ${stamp}`,
    "",
    ...summary.map((s) => `${s.tabelle.padEnd(20)} ${String(s.zeilen).padStart(6)} Zeilen`),
    "",
    "Die CSV-Dateien lassen sich in Excel öffnen (Semikolon als Trennzeichen,",
    "Komma als Dezimalzeichen). Zeilen mit Objektbezug führen den Objektnamen",
    "in der letzten Spalte mit.",
    "",
    "vollstaendig.json enthält dieselben Daten mit Rohwerten und dient dem",
    "vollständigen Zurückspielen.",
  ].join("\n"),
  "utf8",
);

console.log(`Sicherung abgelegt unter ${dir}`);
for (const s of summary) {
  console.log(`  ${s.tabelle.padEnd(20)} ${String(s.zeilen).padStart(6)} Zeilen`);
}
