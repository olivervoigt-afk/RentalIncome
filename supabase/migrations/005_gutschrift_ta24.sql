-- Kennzeichen, ob eine Gutschrift die steuerpflichtige Einnahme mindert.
-- Bestehende Einträge bleiben bewusst auf "nein": es sind Ausgleichsbuchungen
-- aus der Datenübernahme, keine echten Erstattungen.
-- Im Supabase SQL Editor ausführen.

alter table credits
  add column if not exists reduces_ta24 boolean not null default false;
