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

## Widersprüche in der alten Tabelle

Die Kennzahl „total rent due" im Übersichtsblatt stimmt bei einigen Objekten
nicht mit dem Zahlungsplan desselben Blatts überein — sie liegt jeweils um
**volle Raten** zurück, was auf eine nicht nachgezogene Formel hindeutet.
In diesen Fällen gilt der Zahlungsplan:

| Objekt | Rückstand der Kennzahl | Saldo hier |
| --- | --- | --- |
| Zorneding | 3 Raten à 1.505,20 € | 0,00 € |
| Leopoldstrasse 2 Jule Mittenmayer | 2 Raten à 1.760,00 € | 0,00 € |
| Leopoldstrasse 2B Z1 Sarah Makarem | 1 Rate à 528,20 € | −528,52 € |

Anders bei **21111 Portomaso**: dort beträgt die Differenz 2.585,00 € und ist
kein Vielfaches der Rate. Das ist ein echter manueller Betrag und wurde als
Gutschrift übernommen.

Faustregel: Ist die Differenz ein glattes Vielfaches der Miete, hinkt die
alte Kennzahl hinterher und es wird **keine** Gutschrift angelegt. Sonst
handelt es sich um einen manuellen Betrag, der als Gutschrift gehört.
