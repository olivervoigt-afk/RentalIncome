/**
 * Einmalige Korrektur an Leopoldstrasse 2B Z1.
 *
 * Der Datensatz reichte bis 2019 zurueck, obwohl Sarah Makarem erst zum
 * 01.06.2021 eingezogen ist — davor wohnten dort Frau Windmoeller und Frau
 * Schweitzer, deren Zahlungen in derselben Zeile weitergefuehrt wurden.
 *
 * Die Zahlungen vor Juni 2021 wandern in einen eigenen, archivierten
 * Mietvertrag; die Mietstaffel von Sarah beginnt kuenftig mit ihrem
 * Mietbeginn statt 2019.
 *
 *   node scripts/z1-vormieter.mjs             # nur anzeigen
 *   node scripts/z1-vormieter.mjs --schreiben
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

const schreiben = process.argv[2] === "--schreiben";
const GRENZE = "2021-06-01";
const e = (n) => Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2 });

const { data: sarah, error } = await supabase
  .from("properties")
  .select("*")
  .eq("name", "Leopoldstrasse 2B Z1")
  .single();
if (error) throw error;

const { data: alle } = await supabase
  .from("payments")
  .select("id, amount, paid_on")
  .eq("property_id", sarah.id)
  .order("paid_on");

const vorher = alle.filter((x) => x.paid_on < GRENZE);
const nachher = alle.filter((x) => x.paid_on >= GRENZE);

console.log("Leopoldstrasse 2B Z1");
console.log(`  Vormieter (bis 05/2021): ${vorher.length} Zahlungen, ${e(vorher.reduce((a, b) => a + Number(b.amount), 0))}`);
console.log(`  Sarah Makarem (ab 06/2021): ${nachher.length} Zahlungen, ${e(nachher.reduce((a, b) => a + Number(b.amount), 0))}`);

if (!schreiben) {
  console.log("\nTrockenlauf — nichts geschrieben. Mit --schreiben ausfuehren.");
  process.exit(0);
}

// 1. Vormietvertrag anlegen
const { data: vor, error: e1 } = await supabase
  .from("properties")
  .insert({
    name: sarah.name,
    location_id: sarah.location_id,
    investment_id: sarah.investment_id,
    tenant_name: "Windmöller / Schweitzer",
    start_date: "2019-05-01",
    term_months: 25,
    payment_frequency: "monthly",
    ta24: sarah.ta24,
    archived: true,
    notes:
      "Vormieterinnen des Zimmers bis Mai 2021. Ihre Zahlungen liefen bis " +
      "August 2026 im Datensatz von Sarah Makarem mit, weil in der alten " +
      "Tabelle einfach weitergeschrieben wurde.",
  })
  .select("id")
  .single();
if (e1) throw e1;

// 2. Miete des Vormietvertrags
const { error: e2 } = await supabase.from("rent_periods").insert({
  property_id: vor.id,
  valid_from: "2019-05-01",
  valid_to: null,
  amount: 528.22,
});
if (e2) throw e2;

// 3. Zahlungen umhaengen
const { data: verschoben, error: e3 } = await supabase
  .from("payments")
  .update({ property_id: vor.id })
  .in("id", vorher.map((x) => x.id))
  .select("id");
if (e3) throw e3;

// 4. Sarahs Mietstaffel beginnt mit ihrem Mietbeginn
const { data: staffel } = await supabase
  .from("rent_periods")
  .select("id, valid_from, amount")
  .eq("property_id", sarah.id)
  .order("valid_from");

const erste = staffel[0];
const { error: e4 } = await supabase
  .from("rent_periods")
  .update({ valid_from: GRENZE })
  .eq("id", erste.id);
if (e4) throw e4;

// 5. Die Minderung dokumentieren
const { error: e5 } = await supabase
  .from("properties")
  .update({
    notes:
      (sarah.notes ? sarah.notes + "\n\n" : "") +
      "Mietbeginn 01.06.2021. Zum 01.12.2023 wurden 15 % Mietminderung wegen " +
      "Feuchtigkeit gewaehrt: 528,20 auf 449,00 Euro.\n" +
      "Die Zahlungen vor Juni 2021 stammen von den Vormieterinnen und stehen " +
      "seit dem 18.08.2026 in einem eigenen, archivierten Mietvertrag.",
  })
  .eq("id", sarah.id);
if (e5) throw e5;

console.log(`\nVormietvertrag angelegt, ${verschoben.length} Zahlungen umgehaengt,`);
console.log(`Mietstaffel beginnt jetzt am ${GRENZE} (vorher ${erste.valid_from}).`);
