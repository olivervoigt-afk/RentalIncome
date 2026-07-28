-- Notizen am Objekt, wahlweise an eine Person gerichtet.
-- Im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unschädlich.

create table if not exists property_notes (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties on delete cascade,
  author_id    uuid not null references profiles on delete cascade,
  recipient_id uuid references profiles on delete set null,
  parent_id    uuid references property_notes on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create index if not exists property_notes_property_idx
  on property_notes (property_id, created_at desc);
create index if not exists property_notes_recipient_idx
  on property_notes (recipient_id, read_at);

alter table property_notes enable row level security;

-- Ohne Empfänger für alle sichtbar, sonst nur für Absender und Empfänger.
drop policy if exists property_notes_select on property_notes;
create policy property_notes_select on property_notes
  for select to authenticated using (
    recipient_id is null
    or author_id = auth.uid()
    or recipient_id = auth.uid()
  );

-- Schreiben darf jeder Angemeldete, aber nur im eigenen Namen.
drop policy if exists property_notes_insert on property_notes;
create policy property_notes_insert on property_notes
  for insert to authenticated with check (author_id = auth.uid());

-- Als gelesen markieren darf nur der Empfänger.
drop policy if exists property_notes_update on property_notes;
create policy property_notes_update on property_notes
  for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Löschen darf nur, wer die Notiz geschrieben hat.
drop policy if exists property_notes_delete on property_notes;
create policy property_notes_delete on property_notes
  for delete to authenticated using (author_id = auth.uid());
