-- Umstellung des Fälligkeitstags mitten in der Laufzeit.
--
-- Bislang leitete die Anwendung jede Fälligkeit aus dem Mietbeginn ab:
-- Beginn am 17. hiess Fälligkeit am 17., für die gesamte Laufzeit. Wurde der
-- Tag später auf den Monatsersten umgestellt, schob sich zwischen der letzten
-- Rate am alten Tag und der ersten am neuen eine zusätzliche Rate ein — die
-- Anwendung zählte eine Rate zu wenig und der Saldo fiel zu günstig aus.
--
-- Das Feld enthält den Termin der ERSTEN Rate nach der Umstellung. Sein
-- Kalendertag ist zugleich der neue Fälligkeitstag; ein zweites Feld wäre
-- redundant. Leer bedeutet: nie umgestellt, es rechnet wie bisher.
--
-- Im Supabase SQL Editor ausführen. Mehrfaches Ausführen ist unschädlich.

alter table properties
  add column if not exists due_day_from date;

comment on column properties.due_day_from is
  'Termin der ersten Rate nach einer Umstellung des Fälligkeitstags; '
  'NULL = nie umgestellt.';
