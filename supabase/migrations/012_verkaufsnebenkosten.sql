-- Nebenkosten des Verkaufs, etwa die Maklerprovision.
--
-- Sie liessen sich weder als nachträgliche Investition noch als laufende
-- Kosten unterbringen: eine Provision erhöht nicht den Einsatz ins Objekt,
-- sondern mindert den Erlös. Ohne eigenes Feld müsste man sie entweder still
-- vom Verkaufspreis abziehen — dann steht dort nicht mehr, was im Vertrag
-- steht — oder in den Gesamtinvest rechnen, wo sie nicht hingehört.
--
-- Im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unschädlich.

alter table investments
  add column if not exists sale_costs numeric(14,2);

comment on column investments.sale_costs is
  'Nebenkosten des Verkaufs (Makler, Notar); mindern das Gesamtergebnis.';
