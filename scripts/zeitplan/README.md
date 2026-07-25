# Automatische Datensicherung

Sichert den kompletten Datenbestand montags und freitags um 8:00 Uhr nach
`~/Documents/RentalIncomeBackup/`.

## Was entsteht

Je Lauf ein Ordner `Sicherung-JJJJ-MM-TT` mit:

- **eine CSV-Datei je Tabelle** — Semikolon als Trennzeichen, Komma als
  Dezimalzeichen, direkt in Excel zu öffnen. Zeilen mit Objektbezug führen den
  Objektnamen in der letzten Spalte mit, sodass die Dateien auch ohne die
  Anwendung lesbar bleiben.
- **`vollstaendig.json`** — dieselben Daten mit Rohwerten, für ein
  vollständiges Zurückspielen.
- **`LIESMICH.txt`** — Zeilenzahlen je Tabelle als schnelle Kontrolle.

Ein Lauf umfasst derzeit rund 1 MB.

## Einrichtung auf einem anderen Mac

```bash
cp scripts/zeitplan/com.oylio.rentalincome.backup.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.oylio.rentalincome.backup.plist
```

Die Pfade in der Datei sind absolut und müssen angepasst werden, falls Node
oder das Projekt anderswo liegen.

## Von Hand auslösen

```bash
npm run backup                                              # direkt
launchctl kickstart gui/$(id -u)/com.oylio.rentalincome.backup   # über den Zeitplan
```

## Prüfen und abschalten

```bash
launchctl list | grep rentalincome        # ist der Auftrag geladen?
cat ~/Documents/RentalIncomeBackup/protokoll.txt   # letzter Lauf
launchctl bootout gui/$(id -u)/com.oylio.rentalincome.backup   # abschalten
```

## Warum nicht direkt in den Google-Drive-Ordner

macOS verweigert automatisierten Prozessen den Zugriff auf
`~/Library/CloudStorage`. Der Zeitplan würde daran zuverlässig scheitern.
Stattdessen wird `~/Documents/RentalIncomeBackup` in den Einstellungen von
Google Drive für Desktop als synchronisierter Ordner hinterlegt — Drive lädt
den Inhalt dann von selbst hoch.

## Einschränkung

Der Mac muss zum Zeitpunkt laufen. Ist er aus, holt `launchd` den Lauf beim
nächsten Start nach; es fällt also nichts aus, verschiebt sich aber.
