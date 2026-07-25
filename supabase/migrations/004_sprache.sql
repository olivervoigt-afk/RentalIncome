-- Sprachwahl je Benutzer (Deutsch oder Englisch).
-- Im Supabase SQL Editor ausführen.

alter table profiles
  add column if not exists locale text not null default 'de'
  check (locale in ('de', 'en'));
