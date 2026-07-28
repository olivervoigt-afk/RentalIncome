/**
 * Übernimmt die Kautionen aus der alten Google-Tabelle.
 *
 *   python3 migration/deposits.py --json > kautionen.json
 *   node import-deposits.mjs kautionen.json            # nur anzeigen
 *   node import-deposits.mjs kautionen.json --schreiben
 *
 * Zugeordnet wird über den Blattnamen in der Herkunftsnotiz des Objekts.
 * Die Objekte wurden nach der Übernahme umbenannt, die Notiz nicht — der
 * Name taugt deshalb nicht mehr als Schlüssel.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const [, , file, flag] = process.argv;
const schreiben = flag === "--schreiben";

if (!file) {
  console.error("Aufruf: node import-deposits.mjs <kautionen.json> [--schreiben]");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(file, "utf8"));

const { data: properties, error } = await supabase
  .from("properties")
  .select("id, name, notes, start_date, deposit_amount, archived");
if (error) throw error;

/** Blattname aus der Herkunftsnotiz: ... Blatt „Grünwald". */
function sheetOf(property) {
  const m = /Blatt [„"]([^“"]+)[“"]/.exec(property.notes ?? "");
  return m ? m[1].trim() : null;
}

const bySheet = new Map();
for (const property of properties) {
  const sheet = sheetOf(property);
  if (!sheet) continue;
  bySheet.set(sheet, [...(bySheet.get(sheet) ?? []), property]);
}

const { data: existing } = await supabase.from("deposits").select("property_id, kind");
const hasDeposit = new Set((existing ?? []).map((d) => d.property_id));

const plan = [];
const probleme = [];

for (const row of rows) {
  const matches = bySheet.get(row.sheet) ?? [];

  if (matches.length === 0) {
    probleme.push(`${row.sheet}: kein Objekt mit dieser Herkunftsnotiz`);
    continue;
  }
  if (matches.length > 1) {
    // Lieber gar nichts als das falsche Objekt.
    probleme.push(
      `${row.sheet}: mehrdeutig — ${matches.map((p) => p.name).join(", ")}`,
    );
    continue;
  }

  const property = matches[0];
  if (property.archived) {
    // Bei beendeten Mietverhaeltnissen ist die Kaution in aller Regel laengst
    // zurueckgezahlt. Sie als verwahrt einzutragen waere schlicht falsch.
    probleme.push(`${row.sheet}: archiviert, ausgelassen (${row.amount.toFixed(2)})`);
    continue;
  }
  if (hasDeposit.has(property.id)) {
    probleme.push(`${row.sheet}: hat bereits eine Kautionsbuchung, übersprungen`);
    continue;
  }

  plan.push({ property, amount: row.amount });
}

console.log(`${plan.length} Objekte zu übernehmen\n`);
for (const { property, amount } of plan.sort((a, b) => a.property.name.localeCompare(b.property.name, "de"))) {
  console.log(`  ${String(amount.toFixed(2)).padStart(12)}  ${property.name}  (ab ${property.start_date})`);
}
console.log(`\n  Summe: ${plan.reduce((s, p) => s + p.amount, 0).toFixed(2)}`);

if (probleme.length) {
  console.log("\nNicht übernommen:");
  for (const p of probleme) console.log("  " + p);
}

if (!schreiben) {
  console.log("\nTrockenlauf — nichts geschrieben. Mit --schreiben ausführen.");
  process.exit(0);
}

for (const { property, amount } of plan) {
  const { error: e1 } = await supabase
    .from("properties")
    .update({ deposit_amount: amount })
    .eq("id", property.id);
  if (e1) throw e1;

  // Ein Kautionsdatum gibt es in der alten Tabelle nicht. Der Mietbeginn ist
  // der belastbarste Näherungswert und steht so auch in der Notiz.
  const { error: e2 } = await supabase.from("deposits").insert({
    property_id: property.id,
    kind: "received",
    happened_on: property.start_date,
    amount,
    note: "Übernommen aus der alten Tabelle; Datum entspricht dem Mietbeginn",
  });
  if (e2) throw e2;

  console.log(`✓ ${property.name}`);
}

console.log(`\nFertig: ${plan.length} Kautionen übernommen.`);
