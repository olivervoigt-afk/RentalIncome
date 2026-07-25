/**
 * Übernimmt ein Objekt aus der alten Google-Tabelle in die Datenbank.
 * Erwartet eine JSON-Datei, wie sie der Extraktor erzeugt.
 *
 *   node scripts/import-property.mjs <datei.json> [--name "Anzeigename"] [--ersetzen]
 *
 * Ohne --ersetzen bricht der Lauf ab, wenn der Name bereits vergeben ist.
 */
import { createClient } from "@supabase/supabase-js";
import { addMonths } from "date-fns";
import { readFileSync } from "node:fs";

const round2 = (n) => Math.round(n * 100) / 100;

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const args = process.argv.slice(2);
const file = args[0];
const replace = args.includes("--ersetzen");
const nameIdx = args.indexOf("--name");
const overrideName = nameIdx >= 0 ? args[nameIdx + 1] : null;

if (!file) {
  console.error("Aufruf: node scripts/import-property.mjs <datei.json> [--name ...] [--ersetzen]");
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const name = overrideName ?? data.sheet;

const FREQ = { 1: "monthly", 3: "quarterly", 6: "semiannual", 12: "yearly" };
const frequency = FREQ[data.months_per_period];

if (!frequency) {
  console.error(`Rhythmus von ${data.months_per_period} Monaten wird nicht unterstützt.`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// --- Doppelte Anlage verhindern ---
const { data: existing } = await supabase
  .from("properties")
  .select("id, name")
  .eq("name", name)
  .maybeSingle();

if (existing) {
  if (!replace) {
    console.error(`"${name}" ist bereits angelegt. Mit --ersetzen überschreiben.`);
    process.exit(1);
  }
  await supabase.from("properties").delete().eq("id", existing.id);
  console.log(`Bestehendes Objekt "${name}" entfernt.`);
}

// --- Objekt ---
const { data: property, error } = await supabase
  .from("properties")
  .insert({
    name,
    location: data.location ?? "",
    tenant_name: data.tenant ?? "",
    start_date: data.start_date,
    term_months: data.term_months,
    payment_frequency: frequency,
    ta24: Boolean(data.ta24),
    notes: `Übernommen aus der Google-Tabelle „rental income Malta", Blatt „${data.sheet}".`,
  })
  .select("id")
  .single();

if (error) {
  console.error("Objekt konnte nicht angelegt werden:", error.message);
  process.exit(1);
}

// --- Mietstaffel: Gültigkeitsende ist der Tag vor der nächsten Stufe ---
const dayBefore = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const periods = data.escalations.map((e, i) => ({
  property_id: property.id,
  valid_from: e.from,
  valid_to: i + 1 < data.escalations.length ? dayBefore(data.escalations[i + 1].from) : null,
  amount: e.amount,
}));

const { error: periodError } = await supabase.from("rent_periods").insert(periods);
if (periodError) {
  console.error("Mietstaffel fehlgeschlagen:", periodError.message);
  process.exit(1);
}

/* --- Zahlungen ---
 * Die Referenzspalte der alten Tabelle ist uneinheitlich: mal steht dort eine
 * Zahlungsquelle ("Sparkasse"), mal nur der abgedeckte Zeitraum ("March").
 * Deshalb wird nur dann eine Quelle gesetzt, wenn die Referenz exakt einer
 * bereits angelegten Quelle entspricht. Alles andere landet in der Notiz.
 * Neue Quellen legt das Skript bewusst nicht selbst an.
 */
const { data: sources } = await supabase.from("payment_sources").select("id, name");
const byName = new Map(sources.map((s) => [s.name.toLowerCase(), s.id]));

const rows = data.payments.map((p) => {
  const matched = p.reference ? byName.get(p.reference.toLowerCase()) : null;
  return {
    property_id: property.id,
    paid_on: p.date,
    amount: p.amount,
    source_id: matched ?? null,
    note: matched ? "" : (p.reference ?? ""),
  };
});

const asSource = rows.filter((r) => r.source_id).length;
const asNote = rows.filter((r) => r.note).length;

for (let i = 0; i < rows.length; i += 200) {
  const { error: payError } = await supabase.from("payments").insert(rows.slice(i, i + 200));
  if (payError) {
    console.error("Zahlungen fehlgeschlagen:", payError.message);
    process.exit(1);
  }
}

const sum = rows.reduce((a, r) => a + r.amount, 0);

/* --- Ausgleichsgutschrift ---
 * Die alte Tabelle enthält manuelle Beträge, die nur im Saldo stehen und in
 * keinem Zahlungsplan auftauchen. Damit der Saldo nach der Übernahme dem
 * bisherigen Stand entspricht, wird die Differenz als Gutschrift erfasst.
 * Die Fälligkeiten werden dafür exakt so berechnet wie in der Anwendung.
 */
const rateAt = (date) => {
  let best = null;
  for (const p of periods) {
    const from = new Date(`${p.valid_from}T12:00:00Z`);
    if (date < from) continue;
    if (p.valid_to && date > new Date(`${p.valid_to}T12:00:00Z`)) continue;
    if (!best || from > new Date(`${best.valid_from}T12:00:00Z`)) best = p;
  }
  return best ? best.amount : 0;
};

const step = data.months_per_period;
const start = new Date(`${data.start_date}T12:00:00Z`);
const end = addMonths(start, data.term_months);
const today = new Date();

let dueToDate = 0;
for (let i = 0; ; i++) {
  const due = addMonths(start, i * step);
  if (due >= end) break;
  if (due <= today) dueToDate += rateAt(due);
}

const computedBalance = round2(sum - dueToDate);
const targetBalance = data.overview?.balance ?? null;
let credit = null;

if (targetBalance !== null && Math.abs(targetBalance - computedBalance) >= 0.01) {
  credit = round2(targetBalance - computedBalance);
  const { error: creditError } = await supabase.from("credits").insert({
    property_id: property.id,
    credited_on: new Date().toISOString().slice(0, 10),
    amount: credit,
    reason: "Ausgleich aus der Datenübernahme (manuelle Beträge der alten Tabelle)",
  });
  if (creditError) {
    console.error("Gutschrift fehlgeschlagen:", creditError.message);
    process.exit(1);
  }
}

console.log(`
Objekt:        ${name}
Mietbeginn:    ${data.start_date}
Laufzeit:      ${data.term_months} Monate (${frequency})
Mietstaffel:   ${periods.length} Stufen
Zahlungen:     ${rows.length} (${asSource} mit Quelle, ${asNote} mit Notiz)
Summe:         ${sum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
Kontrollwert:  ${(data.stated_payment_sum ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
Abweichung:    ${(sum - (data.stated_payment_sum ?? 0)).toFixed(2)} EUR

Fällig bisher: ${dueToDate.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
Saldo roh:     ${computedBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR
Saldo alt:     ${targetBalance === null ? "unbekannt" : targetBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " EUR"}
Gutschrift:    ${credit === null ? "nicht nötig" : credit.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " EUR"}
`);
