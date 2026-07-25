-- Standorte als gepflegte Liste statt freiem Text.
-- Im Supabase SQL Editor ausführen.

create table if not exists locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  active     boolean not null default true,
  sort_order int not null default 0
);

insert into locations (name, sort_order) values
  ('Deutschland', 1), ('Malta', 2)
on conflict (name) do nothing;

-- Bereits erfasste Standorte übernehmen, damit nichts verloren geht.
insert into locations (name, sort_order)
select distinct trim(location), 10
from properties
where coalesce(trim(location), '') <> ''
on conflict (name) do nothing;

alter table properties
  add column if not exists location_id uuid references locations on delete set null;

update properties p
set location_id = l.id
from locations l
where l.name = trim(p.location) and p.location_id is null;

-- Die Freitextspalte wird nicht mehr gebraucht; ihre Werte stehen jetzt
-- vollständig in locations bzw. properties.location_id.
alter table properties drop column if exists location;

alter table locations enable row level security;

drop policy if exists locations_select on locations;
create policy locations_select on locations
  for select to authenticated using (true);

drop policy if exists locations_admin_write on locations;
create policy locations_admin_write on locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
