/**
 * Legt einmalig das Administrator-Konto an (oder hebt ein bestehendes Konto
 * auf Administrator-Rechte an). Zugangsdaten kommen aus .env.local.
 *
 *   npm run seed-admin
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// .env.local einlesen, ohne zusätzliche Abhängigkeit.
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].trim();
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;

if (!SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Fehlende Werte in .env.local (SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD).");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
const found = existing?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

if (found) {
  await supabase.auth.admin.updateUserById(found.id, {
    password: ADMIN_PASSWORD,
    user_metadata: { full_name: ADMIN_NAME, role: "admin" },
  });
  await supabase.from("profiles").update({ full_name: ADMIN_NAME, role: "admin" }).eq("id", found.id);
  console.log(`Bestehendes Konto ${ADMIN_EMAIL} auf Administrator aktualisiert.`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME, role: "admin" },
  });

  if (error) {
    console.error("Anlegen fehlgeschlagen:", error.message);
    process.exit(1);
  }

  // Sicherstellen, dass der Trigger die Rolle korrekt gesetzt hat.
  await supabase.from("profiles").update({ full_name: ADMIN_NAME, role: "admin" }).eq("id", data.user.id);
  console.log(`Administrator ${ADMIN_EMAIL} wurde angelegt.`);
}
