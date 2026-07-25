/**
 * Vergleicht den Datenbestand der Anwendung mit den Kennzahlen der alten
 * Google-Tabelle. Erwartet das Verzeichnis mit den Extrakt-Dateien.
 *
 *   node scripts/verify-import.mjs <verzeichnis>
 */
import { createClient } from "@supabase/supabase-js";
import { addMonths } from "date-fns";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const dir = process.argv[2];
if (!dir) {
  console.error("Aufruf: node scripts/verify-import.mjs <verzeichnis>");
  process.exit(1);
}

const localDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const FREQ_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 };
const eur = (n) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// --- Erwartungswerte aus den Extrakten ---
const expected = new Map();
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".json") || file === "manifest.json") continue;
  const d = JSON.parse(readFileSync(join(dir, file), "utf8"));
  expected.set(d.import_name ?? d.sheet, {
    received: d.overview?.received ?? null,
    balance: d.overview?.balance ?? null,
    payments: d.payments.length,
  });
}

/**
 * Holt eine Tabelle vollständig. Ohne Blättern liefert die Schnittstelle
 * höchstens 1000 Zeilen — bei mehreren tausend Zahlungen führte das zu
 * scheinbar fehlenden Beträgen.
 */
async function fetchAll(table, columns) {
  const size = 1000;
  const rows = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + size - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

const [properties, periods, payments, credits] = await Promise.all([
  fetchAll("properties", "*"),
  fetchAll("rent_periods", "*"),
  fetchAll("payments", "property_id, amount"),
  fetchAll("credits", "property_id, amount"),
]);
properties.sort((a, b) => a.name.localeCompare(b.name, "de"));

const group = (rows) => {
  const map = new Map();
  for (const r of rows) map.set(r.property_id, [...(map.get(r.property_id) ?? []), r]);
  return map;
};

const byPeriod = group(periods);
const byPayment = group(payments);
const byCredit = group(credits);
const today = new Date();

let totalDue = 0;
let totalReceived = 0;
let totalCredits = 0;
const problems = [];

console.log(
  `${"OBJEKT".padEnd(38)} ${"ERHALTEN".padStart(16)} ${"SALDO".padStart(14)} ${"ERWARTET".padStart(14)}  PRÜFUNG`,
);
console.log("-".repeat(108));

for (const p of properties) {
  const ps = byPeriod.get(p.id) ?? [];
  const rateAt = (date) => {
    let best = null;
    for (const q of ps) {
      const from = localDate(q.valid_from);
      if (date < from) continue;
      if (q.valid_to && date > localDate(q.valid_to)) continue;
      if (!best || from > localDate(best.valid_from)) best = q;
    }
    return best ? Number(best.amount) : 0;
  };

  const start = localDate(p.start_date);
  const end = addMonths(start, p.term_months);
  const step = FREQ_MONTHS[p.payment_frequency];

  let due = 0;
  for (let i = 0; ; i++) {
    const d = addMonths(start, i * step);
    if (d >= end) break;
    if (d <= today) due += rateAt(d);
  }

  const received = (byPayment.get(p.id) ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const credit = (byCredit.get(p.id) ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const balance = Math.round((received + credit - due) * 100) / 100;

  totalDue += due;
  totalReceived += received;
  totalCredits += credit;

  const exp = expected.get(p.name);
  let verdict = "—";
  if (exp) {
    const okReceived = exp.received === null || Math.abs(received - exp.received) < 0.02;
    const okBalance = exp.balance === null || Math.abs(balance - exp.balance) < 0.02;
    verdict = okReceived && okBalance ? "ok" : "ABWEICHUNG";
    if (!okReceived) problems.push(`${p.name}: erhalten ${eur(received)} statt ${eur(exp.received)}`);
    if (!okBalance) problems.push(`${p.name}: Saldo ${eur(balance)} statt ${eur(exp.balance)}`);
  } else {
    verdict = "nicht in Extrakten";
  }

  console.log(
    `${p.name.slice(0, 38).padEnd(38)} ${eur(received).padStart(16)} ${eur(balance).padStart(14)} ` +
      `${(exp?.balance === null || exp === undefined ? "—" : eur(exp.balance)).padStart(14)}  ${verdict}`,
  );
}

console.log("-".repeat(108));
console.log(
  `${"GESAMT".padEnd(38)} ${eur(totalReceived).padStart(16)} ` +
    `${eur(Math.round((totalReceived + totalCredits - totalDue) * 100) / 100).padStart(14)}`,
);
console.log(`\nObjekte: ${properties.length}`);
console.log(`Fällig bisher: ${eur(totalDue)} EUR`);
console.log(`Erhalten:      ${eur(totalReceived)} EUR`);
console.log(`Gutschriften:  ${eur(totalCredits)} EUR`);

if (problems.length) {
  console.log(`\n${problems.length} Abweichung(en):`);
  for (const p of problems) console.log(`  - ${p}`);
} else {
  console.log("\nAlle Objekte stimmen mit der alten Tabelle überein.");
}
