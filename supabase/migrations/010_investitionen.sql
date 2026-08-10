-- Investitionen: die Ebene, auf der gekauft wurde.
--
-- Was die Anwendung "Objekt" nennt, ist ein Mietverhältnis. Gekauft wurde
-- jeweils eine Sache — ein Stockwerk, ein Paket aus vier Wohnungen und vier
-- Stellplätzen —, vermietet wurde sie über viele Verträge nacheinander und
-- nebeneinander. Eine Rendite lässt sich nur auf der Kaufebene bilden; sonst
-- müsste man Paketpreise nach Gefühl aufteilen und verlöre bei jedem
-- Mieterwechsel die Vorgeschichte.
--
-- Im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unschädlich.

create table if not exists investments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  location_id    uuid references locations on delete set null,

  purchased_on   date,
  purchase_price numeric(14,2),

  -- Nebenkosten wahlweise als Prozentsatz oder als Betrag. Ist ein Betrag
  -- gesetzt, sticht er den Prozentsatz.
  costs_percent  numeric(6,3),
  costs_amount   numeric(14,2),

  -- Nicht umlagefähige Kosten pro Jahr, pauschal. Leer bedeutet: die
  -- Kennzahlen sind Bruttowerte und werden auch so beschriftet.
  annual_costs   numeric(14,2),

  -- Aktueller Verkehrswert und sein Stichtag; einmal jährlich zu pflegen.
  valuation      numeric(14,2),
  valued_on      date,

  -- Wert zu Beginn der Mieterfassung. Nötig, weil der Bestand älter ist als
  -- seine Erfassung: mit dem Kaufdatum als Startpunkt fehlten Jahre an
  -- Einnahmen, mit dem alten Kaufpreis zum Erfassungsbeginn wäre der Einsatz
  -- zu niedrig. Leer = Gesamtinvest als Näherung, wird gekennzeichnet.
  opening_value  numeric(14,2),

  -- Verkaufte Investitionen lassen sich damit abschliessen.
  sold_on        date,
  sale_price     numeric(14,2),

  notes          text not null default '',
  created_at     timestamptz not null default now(),
  created_by     uuid references profiles on delete set null,

  check (sold_on is null or sale_price is not null)
);

-- Nachträgliche Investitionen in eine bestehende Immobilie.
create table if not exists investment_expenses (
  id            uuid primary key default gen_random_uuid(),
  investment_id uuid not null references investments on delete cascade,
  happened_on   date not null,
  amount        numeric(14,2) not null check (amount > 0),
  description   text not null default '',
  -- Für die Rendite ohne Belang, für den Steuerberater nicht.
  value_adding  boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by    uuid references profiles on delete set null
);

create index if not exists investment_expenses_idx
  on investment_expenses (investment_id, happened_on);

-- Ein Mietverhältnis gehört zu höchstens einer Investition.
alter table properties
  add column if not exists investment_id uuid references investments on delete set null;

create index if not exists properties_investment_idx on properties (investment_id);


-- ---------- Rechte ----------
-- Kaufpreise sind das Sensibelste, was das System enthält. Anders als bei den
-- übrigen Fachdaten darf hier auch nicht gelesen werden, wer nur Leserechte
-- hat — durchgesetzt in der Datenbank, nicht in der Oberfläche.

alter table investments         enable row level security;
alter table investment_expenses enable row level security;

do $$
declare t text;
begin
  foreach t in array array['investments', 'investment_expenses']
  loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format(
      'create policy %I_select on %I for select to authenticated
         using (public.can_edit())', t, t);

    execute format('drop policy if exists %I_write on %I', t, t);
    execute format(
      'create policy %I_write on %I for all to authenticated
         using (public.can_edit()) with check (public.can_edit())', t, t);
  end loop;
end $$;
