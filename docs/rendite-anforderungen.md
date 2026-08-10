# Renditeberechnung — Anforderungen

Stand: 10.08.2026 · Entwurf zur Durchsicht, noch nicht umgesetzt

## 1. Warum eine zweite Ebene

Was die Anwendung heute „Objekt" nennt, ist ein **Mietverhältnis**. Für die
Mietverwaltung ist das richtig: eigene Laufzeit, eigene Staffel, eigener Saldo.
Für eine Rendite ist es die falsche Bezugsgröße.

Belege aus dem Bestand:

| Einheit | Datensätze | Grund |
| --- | --- | --- |
| Portomaso 1491 | 4 | Mieterwechsel |
| Portomaso 19101 | 3 | Mieterwechsel |
| Linprunstrasse | 17 | Paketkauf: 4 Wohnungen, 4 Stellplätze |
| Leopoldstrasse | 17 | Paketkauf, davon eine Wohnung WG-weise |
| Portomaso Level 2 | 3 | erst ganz vermietet, später A/B/C, heute A&B zusammen |

Gekauft wurde jeweils **eine** Sache, vermietet wurde sie über viele Verträge.

Eine dritte Ebene „Einheit" zwischen Kauf und Vertrag wäre naheliegend, scheitert
aber an Portomaso Level 2: die Einheiten selbst entstehen, verschmelzen und
verschwinden. Stabil sind nur zwei Dinge — **was gekauft wurde** und **wer wann
gezahlt hat**. Genau dazwischen spannt sich die Rechnung auf.

## 2. Datenmodell

**Investition** `1 : n` **Mietverhältnis**. Die Verknüpfung sitzt am Mietvertrag
und darf leer bleiben; ein Vertrag gehört zu höchstens einer Investition
(bestätigt: den Fall „ein Vertrag über zwei Ankäufe" gab es nie).

### `investments`

| Feld | Bedeutung |
| --- | --- |
| `name` | z. B. „Linprunstrasse 12" |
| `location_id` | Standort, wie beim Mietverhältnis |
| `purchased_on` | Kaufdatum |
| `purchase_price` | Kaufpreis |
| `costs_percent` | Nebenkosten in % des Kaufpreises |
| `costs_amount` | Nebenkosten absolut — überschreibt den Prozentsatz |
| `annual_costs` | nicht umlagefähige Kosten p. a., pauschal |
| `valuation` / `valued_on` | aktueller Verkehrswert und sein Stichtag |
| `opening_value` | Wert zu Beginn der Mieterfassung (siehe 4.) |
| `sold_on` / `sale_price` | bei verkauften Investitionen |
| `notes` | frei |

### `investment_expenses`

Nachträgliche Investitionen: `happened_on`, `amount`, `description`,
`value_adding` (werterhöhend ja/nein — für die Rendite ohne Belang, für den
Steuerberater nicht).

### Änderung an `properties`

Eine Spalte `investment_id`, nullable.

### Rechte

Beide Tabellen mit Lese- **und** Schreibrichtlinie auf `can_edit()`. Kaufpreise
sind das Sensibelste, was das System dann enthält; ein Leser darf sie nicht
einmal über die Schnittstelle abrufen können. Wie bei den Notizen erzwingt das
die Datenbank, nicht die Oberfläche.

## 3. Kennzahlen

```
Nebenkosten     = costs_amount, sonst costs_percent × Kaufpreis
Gesamtinvest    = Kaufpreis + Nebenkosten + Σ Investitionen
Einnahmen       = Σ Zahlungen aller zugeordneten Mietverhältnisse im Zeitraum
Jahresmiete     = Σ Jahresmiete der laufenden Verträge der Investition
```

Gutschriften zählen **nicht** als Einnahme — ihnen steht kein Geldeingang
gegenüber; sie zeigen sich ohnehin darin, dass eine Zahlung ausbleibt.
Kautionen zählen nicht; ein als Zahlung verbuchter Kautionseinbehalt schon,
denn er ist Geld.

| Kennzahl | Formel |
| --- | --- |
| Bruttomietrendite | Jahresmiete ÷ Gesamtinvest |
| Nettomietrendite | (Jahresmiete − laufende Kosten) ÷ Gesamtinvest |
| Kapitalrückfluss | Σ Einnahmen seit Erfassungsbeginn ÷ Gesamtinvest |
| Amortisation | (Gesamtinvest − Σ Einnahmen) ÷ Netto-Jahresmiete, in Jahren |
| Wertzuwachs | Verkehrswert − Gesamtinvest |
| IRR p. a. | siehe unten |

### IRR

Zahlungsreihe zu tatsächlichen Terminen (XIRR):

```
Stichtag           − Anfangswert
je Zahlung         + Betrag
je Investition     − Betrag
laufende Kosten    − anteilig je Jahr
Ende               + Verkehrswert   (bzw. + Verkaufspreis am Verkaufsdatum)
```

**Ohne Restwert ist ein IRR bei laufendem Besitz sinnlos** — er unterstellte,
die Immobilie sei am Ende wertlos. Deshalb ist der Verkehrswert Pflicht, sobald
der IRR angezeigt wird. Bei verkauften Investitionen ist er eindeutig und
braucht keine Schätzung.

## 4. Umgang mit Unschärfe

Der Bestand ist älter als seine Erfassung. Zwei naheliegende Wege sind beide
falsch, und zwar in entgegengesetzte Richtungen:

- **Kaufdatum als t0, Mieten erst ab Erfassung** → die Jahre dazwischen fehlen,
  die Rendite fällt zu niedrig aus.
- **Erfassungsbeginn als t0, aber mit dem alten Kaufpreis** → ein Einsatz von
  vor Jahren gegen heutige Mieten, die Rendite fällt zu hoch aus.

Deshalb `opening_value`: **was war die Investition wert, als die Erfassung
begann.** Geschätzt genügt. Voreinstellung ist der Gesamtinvest; solange sie
unverändert ist, wird die Zahl als geschätzt gekennzeichnet.

Weitere Kennzeichen, sichtbar an jeder Zeile:

| Kennzeichen | wann |
| --- | --- |
| „Einnahmen unvollständig" | Kaufdatum liegt mehr als ein Jahr vor dem Erfassungsbeginn |
| „Anfangswert geschätzt" | `opening_value` unverändert übernommen |
| „brutto" | keine laufenden Kosten hinterlegt |
| „ohne Kaufdaten" | keine Investition zugeordnet oder kein Kaufpreis |

Objekte ohne Kaufdaten werden **aufgelistet**, nicht weggelassen — sonst hält
man eine Teilsumme für die Gesamtsumme.

**Nicht gebaut wird** eine Rendite je Wohnung innerhalb eines Pakets. Dafür
müsste der Kaufpreis aufgeteilt werden, und jede Aufteilung wäre geraten.
Ebenso wenig Abschreibung, Steuerlast oder prognostizierte Wertsteigerung —
das ist die Domäne des Steuerberaters.

## 5. Oberfläche

**Seite „Rendite"** (ab Bearbeiter) — Tabelle je Investition mit Gesamtinvest,
Einnahmen, Kapitalrückfluss, Bruttorendite, IRR; sortierbar, Zwischensummen je
Standort, CSV-Export wie bei den anderen Auswertungen.

**Detailseite je Investition** — Stammdaten, Liste der Investitionen mit
Erfassung, zugeordnete Mietverhältnisse, Kennzahlen, Einnahmen je Jahr.

**Mietverhältnis** — eine Zeile „gehört zu …" auf der Übersicht, Zuordnung
änderbar ab Bearbeiter.

**Dashboard** — eine zusätzliche Kachelzeile, nur ab Bearbeiter sichtbar:
Gesamtinvest · Kapitalrückfluss · Bruttorendite Bestand · Wertzuwachs.

## 6. Zuordnung der bestehenden Verträge

76 Mietverhältnisse ergeben nach Namensstamm rund **25 Investitionen**. Ein
Vorschlagslauf belegt die Zuordnung vor, danach eine Liste zum Bestätigen und
Korrigieren. Unsicher sind unter anderem Portomaso Level 2 (A&B und C: ein
Ankauf oder zwei?) und Tipico Tower Level 11.

## 7. Reihenfolge

1. **Tabellen, Zuordnung, Bruttorendite und Kapitalrückfluss** — braucht nur
   Kaufdatum, Kaufpreis, Nebenkosten. Danach ist die Funktion bereits nutzbar.
2. **Nachträgliche Investitionen** erfassen.
3. **Verkehrswerte und IRR.**
4. **Dashboard-Zeile und CSV-Export.**

## 8. Offene Punkte

- Kaufpreise und -daten für alle rund 25 Investitionen bekannt?
- Verkaufsdaten und -preise für die verkauften?
- Nebenkosten: reicht ein Prozentsatz, oder gab es Pauschalbeträge?
- Wie oft sollen Verkehrswerte gepflegt werden — jährlich?
