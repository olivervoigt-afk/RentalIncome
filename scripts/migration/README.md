# Übernahme aus der bisherigen Google-Tabelle

Einmalige Migration aus „rental income Malta". Die Tabelle ist über Jahre
gewachsen, weshalb die Objektblätter nicht einheitlich aufgebaut sind.

## Vorgehen

1. Tabelle als `.xlsx` exportieren und als `sheet.xlsx` neben die Skripte legen.
2. Ein Objekt auslesen und prüfen:

   ```bash
   python3 extract.py "Zorneding" > Zorneding.json
   ```

3. Übernehmen:

   ```bash
   node ../import-property.mjs Zorneding.json
   ```

## Was der Extraktor beachtet

- Felder werden über ihre **Beschriftung** gesucht, nicht über feste Zellen —
  dadurch überstehen die Skripte verschobene Spalten.
- Die Mietstaffel wird aus dem **gepflegten Zahlungsplan** abgeleitet, nicht
  aus der Staffel-Eingabe. Nur so werden einmalig abweichende Raten erfasst.
- Blätter mit der Endung `OLD` gehören zu abgelösten Verträgen und werden
  nicht ausgewertet.
- Jeder Lauf vergleicht die Zahlungssumme gegen die Kontrollsumme im Blatt
  und meldet Abweichungen.

## Bekannte Grenze

Bei einigen Verträgen wurde der Fälligkeitstag mitten in der Laufzeit
umgestellt (z. B. vom 17. auf den 1.). Die Anwendung leitet alle Fälligkeiten
aus dem Mietbeginn ab und kann das nicht abbilden. Beträge und Anzahl der
Raten stimmen, einzelne Fälligkeitstage können abweichen. Verbleibende
Differenzen im Saldo werden als Gutschrift erfasst.
