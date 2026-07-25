-- Optionale Beschreibung zu einem Dokument.
-- Im Supabase SQL Editor ausführen.

alter table property_documents
  add column if not exists note text not null default '';
