"""Übernimmt Kautionen aus der alten Tabelle.

Zugeordnet wird über den Blattnamen in der Notiz des Objekts — die Objekte
wurden nach der Übernahme umbenannt, ihre Herkunftsnotiz aber nicht.

Die Blätter kennen zwei Layouts: die Beschriftung "deposit payed?" steht mal
in Spalte A mit dem Wert rechts daneben, mal als Überschrift in Spalte C mit
dem Wert darunter. Der Betrag steht immer rechts von "deposit".

  python3 deposits.py            # nur anzeigen, nichts schreiben
  python3 deposits.py --json     # Ergebnis als JSON für den Import
"""
import json
import re
import sys

from xlsx import Workbook

WB = "/Users/olivervoigt/Downloads/Rental Income Malta (2).xlsx"

JA = {"1", "ja", "yes", "j", "y", "true", "x"}
NEIN = {"0", "nein", "no", "n", "false", ""}


def normalize(text):
    cleaned = str(text).replace("/", " ").replace("\\", " ")
    return " ".join(cleaned.lower().split())


def find_label(grid, wanted):
    for r, row in enumerate(grid):
        for c, value in enumerate(row):
            if isinstance(value, str) and normalize(value) == wanted:
                return r, c
    return None


def right_of(grid, position):
    """Nur die Zelle rechts daneben. Für den Betrag gibt es keinen Ersatzort:
    griffe man ersatzweise nach unten, läse man bei leerem Feld die nächste
    Beschriftung als Betrag."""
    if position is None:
        return ""
    r, c = position
    return grid[r][c + 1] if c + 1 < len(grid[r]) else ""


def flag_near(grid, position):
    """Beim Häkchen steht der Wert rechts daneben oder — wenn die Beschriftung
    als Spaltenüberschrift dient — direkt darunter."""
    if position is None:
        return ""
    r, c = position
    if c + 1 < len(grid[r]) and grid[r][c + 1] != "":
        return grid[r][c + 1]
    if r + 1 < len(grid) and c < len(grid[r + 1]):
        return grid[r + 1][c]
    return ""


def as_amount(raw):
    """Betrag oder None. Alles, was nicht eindeutig eine Zahl ist, gilt als leer."""
    text = str(raw).strip()
    if not text or not re.fullmatch(r"-?\d+(?:[.,]\d+)?", text):
        return None
    value = float(text.replace(",", "."))
    return value if value > 0 else None


def scan():
    wb = Workbook(WB)
    rows = []

    for name, path in wb.sheets:
        if name.strip().upper().endswith("OLD"):
            continue

        grid = wb.grid(path)
        label = find_label(grid, "deposit")
        if label is None:
            continue

        raw_amount = right_of(grid, label)
        raw_flag = flag_near(grid, find_label(grid, "deposit payed?"))

        amount = as_amount(raw_amount)
        flag = normalize(raw_flag)
        paid = flag in JA

        rows.append(
            {
                "sheet": name,
                "amount": amount,
                "rawAmount": str(raw_amount).strip(),
                "rawFlag": str(raw_flag).strip(),
                "paid": paid,
                "unclear": flag not in JA and flag not in NEIN,
            }
        )

    return rows


def main():
    rows = scan()
    take = [r for r in rows if r["paid"] and r["amount"]]

    if "--json" in sys.argv:
        print(json.dumps(take, indent=2, ensure_ascii=False))
        return

    print(f"{len(rows)} Blätter mit Kautionsfeld\n")

    print("ÜBERNEHMEN — Betrag vorhanden und als gezahlt bestätigt")
    for r in sorted(take, key=lambda x: x["sheet"]):
        print(f"  {r['amount']:>12,.2f}  {r['sheet']}")
    print(f"  Summe: {sum(r['amount'] for r in take):,.2f}\n")

    print("NICHT ÜBERNEHMEN")
    for r in sorted(rows, key=lambda x: x["sheet"]):
        if r in take:
            continue
        if not r["amount"] and not r["paid"]:
            grund = "kein Betrag, nicht bestätigt"
        elif not r["amount"]:
            zelle = r["rawAmount"] or "leer"
            grund = f"als gezahlt markiert, aber kein Betrag ({zelle})"
        elif not r["paid"]:
            grund = f"Betrag {r['amount']:,.2f}, aber nicht bestätigt ({r['rawFlag']!r})"
        else:
            grund = "unerwarteter Fall"
        if r["unclear"]:
            grund += f" — Häkchen unklar: {r['rawFlag']!r}"
        print(f"  {r['sheet']:<34} {grund}")


if __name__ == "__main__":
    main()
