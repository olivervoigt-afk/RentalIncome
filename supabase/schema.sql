-- ============================================================
--  RentalIncome — Datenbankschema
--  Im Supabase SQL Editor ausführen (einmalig).
-- ============================================================

-- ---------- Typen ----------
do $$ begin
  create type user_role as enum ('admin', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_frequency as enum ('monthly', 'quarterly', 'semiannual', 'yearly');
exception when duplicate_object then null; end $$;

-- Für Bestandsdatenbanken, die noch ohne 'semiannual' angelegt wurden.
alter type payment_frequency add value if not exists 'semiannual';


-- ---------- Benutzerprofile ----------
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Legt automatisch ein Profil an, sobald ein Auth-Benutzer erstellt wird.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rolle des angemeldeten Benutzers. SECURITY DEFINER umgeht RLS und
-- verhindert damit Endlosrekursion in den profiles-Policies.
create or replace function public.my_role()
returns user_role
language sql stable
security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.can_edit()
returns boolean
language sql stable
as $$ select public.my_role() in ('admin', 'editor') $$;

create or replace function public.is_admin()
returns boolean
language sql stable
as $$ select public.my_role() = 'admin' $$;


-- ---------- Zahlungsquellen (im Admin-Bereich pflegbar) ----------
create table if not exists payment_sources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  active     boolean not null default true,
  sort_order int not null default 0
);

insert into payment_sources (name, sort_order) values
  ('Bank', 1), ('Bar', 2), ('Sonstige', 3)
on conflict (name) do nothing;


-- ---------- Objekte ----------
create table if not exists properties (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  location          text not null default '',
  tenant_name       text not null default '',
  start_date        date not null,
  term_months       int  not null check (term_months > 0),
  payment_frequency payment_frequency not null default 'monthly',
  ta24              boolean not null default false,
  -- Vertraglich vereinbarte Kaution; 0 bedeutet "keine vereinbart".
  deposit_amount    numeric(12,2) not null default 0,
  notes             text not null default '',
  archived          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists properties_archived_idx on properties (archived);


-- ---------- Mietstaffel: freie Zeiträume mit eigenem Betrag ----------
create table if not exists rent_periods (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  valid_from  date not null,
  valid_to    date,                                   -- NULL = bis Vertragsende
  amount      numeric(12,2) not null check (amount >= 0),
  created_at  timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);

create index if not exists rent_periods_property_idx on rent_periods (property_id, valid_from);


-- ---------- Zahlungseingänge ----------
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  paid_on     date not null,
  amount      numeric(12,2) not null,
  source_id   uuid references payment_sources on delete set null,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  created_by  uuid references profiles on delete set null
);

create index if not exists payments_property_idx on payments (property_id, paid_on);


-- ---------- Kautionen ----------
-- Bewusst eine eigene Tabelle statt einer weiteren Zahlungsquelle: eine
-- Kaution kommt ja ebenfalls per Überweisung oder bar. So können Saldo,
-- TA24 und Jahreseinnahmen sie gar nicht erst einrechnen — sie lesen
-- ausschliesslich die Tabelle payments.

create table if not exists deposits (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,

  -- received = erhalten, refunded = zurückgezahlt, retained = einbehalten
  kind        text not null check (kind in ('received', 'refunded', 'retained')),

  happened_on date not null,
  amount      numeric(12,2) not null check (amount > 0),
  source_id   uuid references payment_sources on delete set null,
  note        text not null default '',

  -- Nur bei kind = 'retained': Wurde der Einbehalt gegen einen Mietrückstand
  -- verrechnet, entsteht eine echte Zahlung. Sie zählt dann in Saldo und
  -- Steuerauswertung, der Einbehalt selbst darf es deshalb nicht mehr.
  payment_id  uuid references payments on delete set null,

  created_at  timestamptz not null default now(),
  created_by  uuid references profiles on delete set null
);

create index if not exists deposits_property_idx on deposits (property_id, happened_on);


-- ---------- Gutschriften (z. B. vom Mieter verauslagte Handwerkerkosten) ----------
create table if not exists credits (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties on delete cascade,
  credited_on  date not null,
  amount       numeric(12,2) not null,
  reason       text not null default '',
  created_at   timestamptz not null default now(),
  created_by   uuid references profiles on delete set null
);

create index if not exists credits_property_idx on credits (property_id, credited_on);


-- ---------- Vertragshistorie (automatisch bei Änderung von Beginn/Laufzeit) ----------
create table if not exists contract_history (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references properties on delete cascade,
  changed_at      timestamptz not null default now(),
  changed_by      uuid references profiles on delete set null,
  old_start_date  date,
  old_term_months int,
  new_start_date  date,
  new_term_months int
);

create index if not exists contract_history_property_idx on contract_history (property_id, changed_at desc);

create or replace function public.log_contract_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (old.start_date is distinct from new.start_date)
     or (old.term_months is distinct from new.term_months) then
    insert into contract_history (
      property_id, changed_by,
      old_start_date, old_term_months,
      new_start_date, new_term_months
    ) values (
      new.id, auth.uid(),
      old.start_date, old.term_months,
      new.start_date, new.term_months
    );
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists on_property_contract_change on properties;
create trigger on_property_contract_change
  before update on properties
  for each row execute function public.log_contract_change();


-- ---------- Dokumente (Mietverträge als PDF) ----------
create table if not exists property_documents (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties on delete cascade,
  file_name    text not null,
  storage_path text not null,
  size_bytes   bigint,
  uploaded_at  timestamptz not null default now(),
  uploaded_by  uuid references profiles on delete set null
);

create index if not exists property_documents_property_idx on property_documents (property_id);


-- ============================================================
--  Row Level Security
--  Grundregel: Alle angemeldeten Benutzer dürfen lesen.
--  Schreiben nur Admin + Bearbeiter. Benutzerverwaltung nur Admin.
-- ============================================================

alter table profiles           enable row level security;
alter table payment_sources    enable row level security;
alter table properties         enable row level security;
alter table rent_periods       enable row level security;
alter table payments           enable row level security;
alter table credits            enable row level security;
alter table contract_history   enable row level security;
alter table property_documents enable row level security;

-- Profile: jeder sieht alle Namen; nur Admin darf Rollen ändern/anlegen/löschen.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated using (true);

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Zahlungsquellen: lesen alle, ändern nur Admin.
drop policy if exists payment_sources_select on payment_sources;
create policy payment_sources_select on payment_sources
  for select to authenticated using (true);

drop policy if exists payment_sources_admin_write on payment_sources;
create policy payment_sources_admin_write on payment_sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Fachdaten: lesen alle, schreiben Admin + Bearbeiter.
do $$
declare t text;
begin
  foreach t in array array['properties', 'rent_periods', 'payments', 'credits',
                        'deposits', 'property_documents']
  loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format(
      'create policy %I_select on %I for select to authenticated using (true)', t, t);

    execute format('drop policy if exists %I_write on %I', t, t);
    execute format(
      'create policy %I_write on %I for all to authenticated
         using (public.can_edit()) with check (public.can_edit())', t, t);
  end loop;
end $$;

-- Vertragshistorie: nur lesen (Einträge entstehen ausschließlich per Trigger).
drop policy if exists contract_history_select on contract_history;
create policy contract_history_select on contract_history
  for select to authenticated using (true);


-- ---------- Notizen am Objekt ----------
-- Ohne Empfänger eine Aktennotiz für alle, mit Empfänger nur für die
-- beiden Beteiligten. Die Regel steht in den Richtlinien, nicht in der
-- Oberfläche.

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


-- ============================================================
--  Storage: privater Bucket für Mietvertrags-PDFs
-- ============================================================

insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do nothing;

drop policy if exists property_docs_read on storage.objects;
create policy property_docs_read on storage.objects
  for select to authenticated
  using (bucket_id = 'property-documents');

drop policy if exists property_docs_write on storage.objects;
create policy property_docs_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-documents' and public.can_edit());

drop policy if exists property_docs_delete on storage.objects;
create policy property_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-documents' and public.can_edit());
