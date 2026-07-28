-- Kautionen. Bewusst eine eigene Tabelle und nicht eine weitere
-- Zahlungsquelle: eine Kaution kommt ja ebenfalls per Überweisung oder bar.
-- So können Saldo, TA24 und Jahreseinnahmen sie gar nicht erst einrechnen —
-- sie lesen ausschließlich die Tabelle payments.
-- Im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unschädlich.

-- Vertraglich vereinbarte Kaution (Soll) am Objekt.
alter table properties
  add column if not exists deposit_amount numeric(12,2) not null default 0;

create table if not exists deposits (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,

  -- received  = Kaution erhalten
  -- refunded  = bei Auszug zurückgezahlt
  -- retained  = einbehalten; damit wird sie zur steuerpflichtigen Einnahme
  kind        text not null check (kind in ('received', 'refunded', 'retained')),

  happened_on date not null,
  amount      numeric(12,2) not null check (amount > 0),
  source_id   uuid references payment_sources on delete set null,
  note        text not null default '',

  -- Nur bei kind = 'retained' gesetzt: Wurde der Einbehalt gegen einen
  -- Mietrückstand verrechnet, entsteht eine echte Zahlung. Sie fließt dann
  -- über payments in Saldo und Steuerauswertung — der Einbehalt selbst darf
  -- in den Auswertungen deshalb nicht noch einmal gezählt werden.
  payment_id  uuid references payments on delete set null,

  created_at  timestamptz not null default now(),
  created_by  uuid references profiles on delete set null
);

create index if not exists deposits_property_idx on deposits (property_id, happened_on);

alter table deposits enable row level security;

drop policy if exists deposits_select on deposits;
create policy deposits_select on deposits
  for select to authenticated using (true);

drop policy if exists deposits_write on deposits;
create policy deposits_write on deposits
  for all to authenticated
  using (public.can_edit()) with check (public.can_edit());
