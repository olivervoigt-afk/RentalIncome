-- Standorte und Zahlungsquellen dürfen künftig auch Bearbeiter pflegen,
-- nicht mehr nur Administratoren.
-- Im Supabase SQL Editor ausführen.

drop policy if exists locations_admin_write on locations;
create policy locations_write on locations
  for all to authenticated using (public.can_edit()) with check (public.can_edit());

drop policy if exists payment_sources_admin_write on payment_sources;
create policy payment_sources_write on payment_sources
  for all to authenticated using (public.can_edit()) with check (public.can_edit());
