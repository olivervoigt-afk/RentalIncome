"""Liest ein Objektblatt der Google-Tabelle aus und prueft es gegen die
Kontrollsummen, die im Blatt selbst stehen.

    python3 extract.py "Zorneding"
"""
import json
import re
import sys
from datetime import date
from xlsx import Workbook, serial_to_date

FILLER_YEAR = 2090  # Leere Staffelzeilen tragen Platzhalterdaten weit in der Zukunft.


# Trennzeichen duerfen sich wiederholen: in der Quelle steht auch "01.10..2025".
TEXT_DATE = re.compile(r"^(\d{1,2})[.\-/]+(\d{1,2})[.\-/]+(\d{2,4})$")


DAYS_IN_MONTH = (31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)


def cell_date(value):
    """Datum aus einer Zelle: Serienzahl oder Text wie "03.04.2025".

    Die Quelle enthaelt vereinzelt Tippfehler — unmoegliche Tage (31.11.) und
    verrutschte Jahreszahlen (0205 statt 2025). Beides wird korrigiert und als
    "issue" gemeldet, damit es in der Pruefliste auffaellt.
    """
    direct = serial_to_date(value)
    if direct:
        return direct, None

    m = TEXT_DATE.match(str(value).strip())
    if not m:
        return None, None

    day, month, year = (int(x) for x in m.groups())
    if not 1 <= month <= 12:
        return None, None

    issue = None

    if day > DAYS_IN_MONTH[month - 1]:
        day = DAYS_IN_MONTH[month - 1]
        issue = "tag"

    if not 1990 <= year <= 2100:
        # Jahr wird spaeter aus den umliegenden Zahlungen abgeleitet.
        return (month, day), "jahr"

    try:
        return date(year, month, day), issue
    except ValueError:
        return None, None


def num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def find_label(grid, text, max_col=3):
    """Zeile und Spalte der ersten Zelle, die mit text beginnt."""
    needle = text.lower()
    for r, row in enumerate(grid):
        for c, v in enumerate(row[:max_col]):
            if isinstance(v, str) and v.strip().lower().startswith(needle):
                return r, c
    return None, None


def find_exact(grid, text, max_col=3):
    """Wie find_label, aber die Zelle muss genau dem Text entsprechen.

    Noetig fuer kurze Beschriftungen der aelteren Blaetter ("Rent", "#"),
    die sonst auch auf "Rent adjustments" passen wuerden.
    """
    needle = text.lower()
    for r, row in enumerate(grid):
        for c, v in enumerate(row[:max_col]):
            if isinstance(v, str) and v.strip().lower() == needle:
                return r, c
    return None, None


def value_right(grid, row, col):
    """Erster nicht leerer Wert rechts der Beschriftung."""
    if row is None:
        return None
    for c in range(col + 1, min(col + 4, len(grid[row]))):
        if grid[row][c] != "":
            return grid[row][c]
    return None


def normalize(text):
    """Vergleichsform: Kleinschreibung, ohne Trennzeichen, Leerraum gestaucht.

    Noetig, weil Blattnamen im xlsx-Export auf 31 Zeichen gekuerzt werden und
    Schraegstriche dort durch Leerzeichen ersetzt sind.
    """
    cleaned = str(text).replace("/", " ").replace("\\", " ")
    return " ".join(cleaned.lower().split())


def summary_row(wb, sheet_name):
    """Zeile des Objekts im Uebersichtsblatt: TA24, Soll, Ist, Saldo.

    Eine genaue Namensgleichheit hat Vorrang. Nur wenn es keine gibt, wird auf
    den Praefix ausgewichen — Blattnamen sind im xlsx-Export auf 31 Zeichen
    gekuerzt. Ohne diesen Vorrang bekaeme "Tigne Point Q1-37" die Werte von
    "Tigne Point Q1-37 Eman".
    """
    grid = wb.grid(next(p for n, p in wb.sheets if n == "Summary"))
    wanted = normalize(sheet_name)

    exact, prefixed = [], []
    for row in grid:
        label = row[1] if len(row) > 1 else ""
        if not isinstance(label, str) or not label.strip():
            continue
        candidate = normalize(label)
        if candidate == wanted:
            exact.append(row)
        elif candidate.startswith(wanted):
            prefixed.append((len(candidate), row))

    if exact:
        row = exact[0]
    elif prefixed:
        # Der kuerzeste Treffer liegt am naechsten am gekuerzten Blattnamen.
        row = min(prefixed, key=lambda x: x[0])[1]
    else:
        return None

    def cell(i):
        return num(row[i]) if len(row) > i else None

    raw_ta24 = row[11] if len(row) > 11 else ""
    return {
        "ta24": str(raw_ta24).strip().upper() in ("TRUE", "1", "JA", "WAHR"),
        "balance": cell(2),
        "due": cell(4),
        "received": cell(5),
        "contract_end": serial_to_date(row[7] if len(row) > 7 else ""),
    }


def read_plan(grid):
    """Der im Blatt gepflegte Zahlungsplan.

    Die Spalten liegen je nach Alter des Blatts unterschiedlich, deshalb wird
    die Kopfzelle "due date" gesucht; der Betrag steht rechts daneben.
    """
    r_head = c_due = None
    for r, row in enumerate(grid):
        for c, v in enumerate(row[:14]):
            if isinstance(v, str) and v.strip().lower() == "due date":
                r_head, c_due = r, c
                break
        if r_head is not None:
            break

    if c_due is None:
        return []

    plan = []
    for r in range(r_head + 1, len(grid)):
        row = grid[r]
        d = serial_to_date(row[c_due] if len(row) > c_due else "")
        a = num(row[c_due + 1] if len(row) > c_due + 1 else "")
        if d is None or a is None or d.year >= FILLER_YEAR:
            continue
        plan.append({"due": d, "amount": round(a, 2)})

    plan.sort(key=lambda p: p["due"])
    return plan


def periods_from_plan(plan):
    """Fasst aufeinanderfolgende Raten gleicher Hoehe zu Staffelstufen zusammen.

    Dadurch werden auch einmalig abweichende Raten korrekt abgebildet, die
    sich aus der reinen Staffel-Eingabe nicht ableiten lassen.
    """
    steps = []
    for entry in plan:
        if steps and abs(steps[-1]["amount"] - entry["amount"]) < 0.005:
            continue
        steps.append({"from": entry["due"].isoformat(), "amount": entry["amount"]})
    return steps


def extract(wb, sheet_name):
    path = next(p for n, p in wb.sheets if n == sheet_name)
    grid = wb.grid(path)
    warnings = []

    def labelled(text):
        r, c = find_label(grid, text)
        if r is None:
            warnings.append(f'Beschriftung "{text}" nicht gefunden')
            return None
        return value_right(grid, r, c)

    def either(primary, fallback_exact):
        """Neuere Blaetter tragen ausfuehrliche Beschriftungen, aeltere kurze."""
        r, c = find_label(grid, primary)
        if r is None:
            r, c = find_exact(grid, fallback_exact)
        if r is None:
            warnings.append(f'Beschriftung "{primary}" nicht gefunden')
            return None
        return value_right(grid, r, c)

    rent = num(either("Rent per period", "Rent"))
    months = num(labelled("payable after x months"))
    periods = num(either("for how many periods", "#"))
    start = serial_to_date(labelled("first payment due"))

    # Titelzeile: A="Summary", B=<Bezeichnung>
    r_sum, c_sum = find_label(grid, "Summary")
    title = value_right(grid, r_sum, c_sum) if r_sum is not None else None

    # Mieter steht bei "contract terms" daneben, sofern es keine Vorlage ist.
    tenant = labelled("contract terms")
    if isinstance(tenant, str):
        # Aeltere Blaetter fuehren dort den Objektnamen statt eines Mieters.
        if tenant.strip().lower() in ("vorlage", "template") or normalize(
            tenant
        ) == normalize(sheet_name):
            tenant = ""

    # --- Mietstaffel: Spalten A/B unterhalb von "Rent adjustments" ---
    r_adj, _ = find_label(grid, "Rent adjustment")
    if r_adj is None:
        r_adj, _ = find_label(grid, "Rent escalation")
    # Die Staffel endet dort, wo der Zahlungsteil beginnt.
    stops = [
        r for r, _ in (
            find_label(grid, "Payment Sum"),
            find_label(grid, "Payment Date"),
            find_exact(grid, "Payments"),
        ) if r is not None
    ]
    r_stop = min(stops) if stops else None

    escalations = []
    if r_adj is not None:
        end = r_stop if r_stop is not None else len(grid)
        for r in range(r_adj + 1, end):
            d = serial_to_date(grid[r][0] if len(grid[r]) > 0 else "")
            a = num(grid[r][1] if len(grid[r]) > 1 else "")
            if d is None or a is None:
                continue
            if d.year >= FILLER_YEAR or a <= 0:
                continue  # ungenutzte Platzhalterzeile
            escalations.append({"from": d.isoformat(), "amount": round(a, 2)})

    escalations.sort(key=lambda e: e["from"])

    # --- Zahlungen: unterhalb der Kopfzeile "Payment Date" ---
    r_pay, c_pay = find_label(grid, "Payment Date")
    if r_pay is None:
        r_pay, c_pay = find_exact(grid, "Payments")

    payments = []
    if r_pay is None:
        warnings.append("Zahlungsliste nicht gefunden")
    else:
        missing_year = []  # Positionen, deren Jahr erst noch bestimmt wird.

        for r in range(r_pay + 1, len(grid)):
            row = grid[r]
            raw = row[c_pay] if len(row) > c_pay else ""
            parsed, issue = cell_date(raw)
            a = num(row[c_pay + 1] if len(row) > c_pay + 1 else "")
            if parsed is None or a is None or a == 0:
                continue
            if issue != "jahr" and parsed.year >= FILLER_YEAR:
                continue

            ref = row[c_pay + 2] if len(row) > c_pay + 2 else ""
            entry = {
                "date": None if issue == "jahr" else parsed.isoformat(),
                "amount": round(a, 2),
                "reference": str(ref).strip(),
            }
            payments.append(entry)

            if issue == "jahr":
                missing_year.append((len(payments) - 1, parsed, raw))
            elif issue == "tag":
                warnings.append(
                    f'Zahlungsdatum "{raw}" gibt es nicht — als {entry["date"]} '
                    "übernommen, bitte prüfen"
                )

        # Jahr aus der zuletzt davor stehenden lesbaren Zahlung ableiten.
        for idx, (month, day), raw in missing_year:
            earlier = [p["date"] for p in payments[:idx] if p["date"]]
            later = [p["date"] for p in payments[idx + 1 :] if p["date"]]
            reference = earlier[-1] if earlier else (later[0] if later else None)
            year = int(reference[:4]) if reference else date.today().year

            payments[idx]["date"] = f"{year:04d}-{month:02d}-{day:02d}"
            warnings.append(
                f'Zahlungsdatum "{raw}" ist unlesbar — als '
                f'{payments[idx]["date"]} übernommen, bitte prüfen'
            )

    # --- Kontrollsummen aus dem Blatt ---
    r_ps, c_ps = find_label(grid, "Payment Sum")
    if r_ps is None:
        # Aeltere Blaetter fuehren die Summe als Zeile "sum" direkt unter der
        # Ueberschrift des Zahlungsteils.
        r_ps, c_ps = find_exact(grid, "sum")

    stated_sum = num(value_right(grid, r_ps, c_ps)) if r_ps is not None else None
    if stated_sum is None and r_ps is not None and r_ps + 1 < len(grid):
        # Der Wert steht bei manchen Blaettern eine Zeile tiefer.
        stated_sum = num(grid[r_ps + 1][c_ps + 1] if len(grid[r_ps + 1]) > c_ps + 1 else "")

    r_due, c_due = find_label(grid, "total rent due", max_col=12)
    stated_due = num(value_right(grid, r_due, c_due)) if r_due is not None else None

    paid = round(sum(p["amount"] for p in payments), 2)

    if rent is None or start is None or periods is None:
        warnings.append("Vertragsdaten unvollständig")
    if months not in (1, 3, 6, 12):
        warnings.append(f"Ungewöhnlicher Rhythmus: {months} Monate")
    if stated_sum is not None and abs(paid - stated_sum) > 1:
        warnings.append(
            f"Zahlungssumme weicht ab: berechnet {paid:,.2f} vs. Blatt {stated_sum:,.2f}"
        )
    if not escalations and rent:
        escalations.append({"from": start.isoformat(), "amount": round(rent, 2)})
        warnings.append("Keine Staffel gefunden — Grundmiete ab Vertragsbeginn angesetzt")

    # Der gepflegte Zahlungsplan ist massgeblich: er enthaelt auch einmalige
    # Abweichungen. Die Staffel-Eingabe dient nur als Rueckfallebene.
    plan = read_plan(grid)
    plan_steps = periods_from_plan(plan)
    plan_total = round(sum(p["amount"] for p in plan), 2)

    if plan_steps:
        if len(plan_steps) > len(escalations):
            warnings.append(
                f"{len(plan_steps) - len(escalations)} Sonderrate(n) im Zahlungsplan "
                "gefunden und als eigene Staffelstufe übernommen"
            )
        escalations = plan_steps

        # Bei einigen Vertraegen weicht das Feld "first payment due" vom
        # tatsaechlichen Plan ab. Der Plan gilt, sonst liegt die erste Rate
        # ausserhalb jeder Staffelstufe und faellt mit 0 EUR heraus.
        plan_start = plan[0]["due"]
        if start is None or plan_start != start:
            if start is not None:
                warnings.append(
                    f"Mietbeginn laut Feld {start.isoformat()}, laut Zahlungsplan "
                    f"{plan_start.isoformat()} — Plan übernommen"
                )
            start = plan_start

        # Die Laufzeit bleibt beim Feld: die Planvorlage endet nach 200 Zeilen
        # und ist bei langen Vertraegen abgeschnitten.

    overview = summary_row(wb, sheet_name)
    if overview is None:
        warnings.append("Objekt steht nicht im Übersichtsblatt — TA24 unbekannt")
    elif overview["received"] is not None and abs(paid - overview["received"]) > 1:
        warnings.append(
            f"Weicht von der Übersicht ab: dort {overview['received']:,.2f} erhalten"
        )

    return {
        "sheet": sheet_name,
        "title": title,
        "ta24": overview["ta24"] if overview else False,
        "overview": {
            "balance": overview["balance"] if overview else None,
            "due": overview["due"] if overview else None,
            "received": overview["received"] if overview else None,
            "contract_end": overview["contract_end"].isoformat()
            if overview and overview["contract_end"]
            else None,
        },
        "tenant": tenant or "",
        "rent_per_period": rent,
        "months_per_period": months,
        "periods": periods,
        "term_months": int(periods * months) if periods and months else None,
        "start_date": start.isoformat() if start else None,
        "escalations": escalations,
        "plan_count": len(plan),
        "plan_total": plan_total,
        "payments": payments,
        "paid_total": paid,
        "stated_payment_sum": stated_sum,
        "stated_total_due": stated_due,
        "warnings": warnings,
    }


if __name__ == "__main__":
    wb = Workbook("sheet.xlsx")
    result = extract(wb, sys.argv[1])
    print(json.dumps(result, indent=2, ensure_ascii=False))
