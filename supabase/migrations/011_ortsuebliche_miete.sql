-- Ortsübliche Miete je Investition.
--
-- Zweimal in Folge lag die tatsächliche Miete aus gutem Grund unter der
-- Marktmiete — bei Grünwald, weil der Mieter die Sanierung bezahlt hat, bei
-- Zorneding wegen der Vermietung an einen Angehörigen. Ohne Bezugsgröße liest
-- sich die Rendite dieser Objekte wie ein Fehlgriff.
--
-- Mit dem Feld stehen beide Zahlen nebeneinander: was das Objekt bringt und
-- was es bringen könnte. Die Differenz ist dann sichtbar verschenkt statt
-- unsichtbar verloren.
--
-- Im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unschädlich.

alter table investments
  add column if not exists market_rent numeric(14,2);

comment on column investments.market_rent is
  'Ortsübliche Jahresmiete aller Einheiten dieser Investition; NULL = nicht erfasst.';
