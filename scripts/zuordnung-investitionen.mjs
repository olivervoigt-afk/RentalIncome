/**
 * Einmalige Zuordnung der bestehenden Mietverhältnisse zu Investitionen.
 *
 *   node scripts/zuordnung-investitionen.mjs             # nur anzeigen
 *   node scripts/zuordnung-investitionen.mjs --schreiben
 *
 * Die Gruppierung folgt dem Namensstamm, mit drei vom Eigentümer bestätigten
 * Ausnahmen: die Leopoldstrasse besteht aus zwei getrennt gekauften Einheiten,
 * Portomaso 311101 ist ein Tippfehler für 31111, und die drei Vaults gehören
 * zu einem Ankauf.
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

/** Name der Investition zu einem Mietverhältnis. */
function investmentOf(name) {
  const n = name.replace(/\s+/g, " ").trim();

  // Zwei getrennt gekaufte Einheiten im selben Haus.
  if (/^Leopoldstrasse 2B/i.test(n)) return "Leopoldstrasse 2. OG";
  if (/^Leopoldstrasse/i.test(n)) return "Leopoldstrasse 1. OG";

  if (/^Linprunstrasse/i.test(n)) return "Linprunstrasse";

  // Ein Ankauf, drei Einheiten.
  if (/^Vault /i.test(n)) return "Captain of the galley";

  // Tippfehler: 311101 meint 31111.
  if (/^Portomaso 311101/i.test(n)) return "Portomaso 31111";

  let m;
  if ((m = n.match(/^Portomaso Level (\d+)/i))) return `Portomaso Level ${m[1]}`;
  if ((m = n.match(/^Portomaso (\d+)/i))) return `Portomaso ${m[1]}`;
  if ((m = n.match(/^(Tigne Point Level \d+|Tipico Tower Level \d+|The Seven 7|Porto Rosso)/i)))
    return m[1];

  return n;
}

const { data: properties, error } = await supabase
  .from("properties")
  .select("id, name, tenant_name, archived, location_id, investment_id")
  .order("name");
if (error) throw error;

const groups = new Map();
for (const property of properties) {
  const key = investmentOf(property.name);
  groups.set(key, [...(groups.get(key) ?? []), property]);
}

/** Häufigster Standort der Gruppe — sie sollten ohnehin übereinstimmen. */
function locationOf(members) {
  const count = new Map();
  for (const m of members) {
    if (m.location_id) count.set(m.location_id, (count.get(m.location_id) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

const plan = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "de"));

console.log(`${properties.length} Mietverhältnisse -> ${plan.length} Investitionen\n`);
for (const [name, members] of plan) {
  const aktiv = members.filter((m) => !m.archived).length;
  console.log(`  ${name.padEnd(26)} ${String(members.length).padStart(2)} Verträge (${aktiv} aktiv)`);
}

if (!schreiben) {
  console.log("\nTrockenlauf — nichts geschrieben. Mit --schreiben ausführen.");
  process.exit(0);
}

const { data: existing } = await supabase.from("investments").select("id, name");
const byName = new Map((existing ?? []).map((i) => [i.name, i.id]));

let angelegt = 0;
let zugeordnet = 0;

for (const [name, members] of plan) {
  let id = byName.get(name);

  if (!id) {
    const { data, error: e } = await supabase
      .from("investments")
      .insert({ name, location_id: locationOf(members) })
      .select("id")
      .single();
    if (e) throw e;
    id = data.id;
    angelegt++;
  }

  const offen = members.filter((m) => m.investment_id !== id).map((m) => m.id);
  if (offen.length === 0) continue;

  const { error: e2 } = await supabase
    .from("properties")
    .update({ investment_id: id })
    .in("id", offen);
  if (e2) throw e2;
  zugeordnet += offen.length;

  console.log(`✓ ${name}: ${offen.length} zugeordnet`);
}

console.log(`\nFertig: ${angelegt} Investitionen angelegt, ${zugeordnet} Verträge zugeordnet.`);
