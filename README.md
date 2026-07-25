# RentalIncome

Webanwendung zur Verwaltung von Immobilien und deren Mieteinkünften.

## Funktionen

- **Dashboard** — alle Objekte tabellarisch mit fälliger Miete, Zahlungseingängen, Saldo, Restlaufzeit und TA24-Kennzeichnung, inklusive Gesamtsumme
- **Objekte** — Mietbeginn, Laufzeit, Zahlungsrhythmus (monatlich, quartalsweise, jährlich) und frei staffelbare Mietzeiträume
- **Zahlungen** — Zahlungsdatum und Quelle (Bank, Bar, Sonstige — im Admin-Bereich erweiterbar)
- **Gutschriften** — Beträge, die dem Mieter angerechnet werden, etwa selbst bezahlte Handwerker
- **Dokumente** — Mietverträge als PDF je Objekt
- **Benutzer** — Administrator, Bearbeiter und Leser
- **Import** — bestehende Listen aus Excel oder Google Sheets per CSV

## Saldo-Berechnung

```
Fällig bisher  = Summe aller Raten mit Fälligkeit ≤ heute
Saldo          = Erhalten + Gutschriften − Fällig bisher
```

Die erste Rate ist am Mietbeginn fällig, jede weitere im Abstand des
Zahlungsrhythmus. Der Tag des Mietbeginns bestimmt also den Fälligkeitstag;
bei kürzeren Monaten wird auf den letzten Monatstag gekürzt.

Ein negativer Saldo ist ein Rückstand, ein positiver eine Vorauszahlung.

## Technik

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, Storage)

## Einrichtung

1. **Datenbank anlegen** — Inhalt von `supabase/schema.sql` im Supabase SQL Editor ausführen.

2. **Zugangsdaten hinterlegen** — `.env.example` nach `.env.local` kopieren und ausfüllen.

3. **Starten**

   ```bash
   npm install
   npm run seed-admin   # legt einmalig das Administrator-Konto an
   npm run dev
   ```

   Die Anwendung läuft dann auf http://localhost:3000

## Deployment

Die App braucht einen Node.js-Server und lässt sich **nicht** auf GitHub Pages
betreiben — der Secret Key darf nie in den Browser gelangen.

Auf [Vercel](https://vercel.com) das Repository importieren und unter
*Settings → Environment Variables* diese drei Werte eintragen:

| Variable | Quelle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dito (publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | dito (secret key) |

Die `ADMIN_*`-Variablen werden dort nicht benötigt.

## Sicherheit

- Zugriffsrechte werden über Row Level Security in der Datenbank durchgesetzt,
  zusätzlich prüft jede Server Action die Rolle des Aufrufers.
- Der Dokumenten-Bucket ist privat; Downloads laufen über zeitlich begrenzte Signaturen.
- `.env.local` steht in `.gitignore` und darf nicht eingecheckt werden.
