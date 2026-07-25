-- Ergänzt den Zahlungsrhythmus "halbjährlich".
-- Im Supabase SQL Editor ausführen.

alter type payment_frequency add value if not exists 'semiannual';
