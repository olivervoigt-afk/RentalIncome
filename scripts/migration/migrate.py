"""Liest einen Block des Uebersichtsblatts aus und legt je Objekt eine
JSON-Datei zur Uebernahme an. Gibt eine Pruefliste aus.

    python3 migrate.py aktiv      # Zeilen 6-35
    python3 migrate.py archiv     # Zeilen 39-84
"""
import json
import os
import re
import sys

from xlsx import Workbook
from extract import extract, normalize

BLOCKS = {"aktiv": (6, 35), "archiv": (39, 84)}

block = sys.argv[1] if len(sys.argv) > 1 else "aktiv"
if block not in BLOCKS:
    print(f"Unbekannter Block: {block}. Erlaubt: {', '.join(BLOCKS)}")
    sys.exit(1)

first, last = BLOCKS[block]
outdir = f"out_{block}"
os.makedirs(outdir, exist_ok=True)

wb = Workbook("sheet.xlsx")

# Blaetter abgeloester Vertraege ("... OLD", "... OLD!") bleiben aussen vor.
IGNORED = re.compile(r"(\bOLD\b[\s!]*$)|^Tabellenblatt|^Summary$|^DRAFT$", re.I)
candidates = [n for n, _ in wb.sheets if not IGNORED.search(n)]


def find_sheet(name):
    wanted = normalize(name)
    exact = [s for s in candidates if normalize(s) == wanted]
    if exact:
        return exact[0]
    # Blattnamen sind im Export auf 31 Zeichen gekuerzt.
    partial = [s for s in candidates if wanted.startswith(normalize(s))]
    if partial:
        return max(partial, key=lambda s: len(normalize(s)))
    return None


summary = wb.grid(next(p for n, p in wb.sheets if n == "Summary"))
report = []

for r in range(first - 1, last):
    row = summary[r] if r < len(summary) else []
    name = str(row[1]).strip() if len(row) > 1 else ""
    if not name:
        continue

    sheet = find_sheet(name)
    if sheet is None:
        report.append({"name": name, "sheet": None, "status": "kein Datenblatt gefunden"})
        continue

    try:
        data = extract(wb, sheet)
    except Exception as exc:  # noqa: BLE001 — Ergebnis wird als Fehler gemeldet
        report.append({"name": name, "sheet": sheet, "status": f"Lesefehler: {exc}"})
        continue

    data["import_name"] = name
    data["archived"] = block == "archiv"

    slug = re.sub(r"[^\w]+", "_", name).strip("_")
    path = os.path.join(outdir, f"{slug}.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)

    report.append(
        {
            "name": name,
            "sheet": sheet,
            "file": path,
            "status": "ok",
            "payments": len(data["payments"]),
            "steps": len(data["escalations"]),
            "paid": data["paid_total"],
            "stated": data["stated_payment_sum"],
            "months": data["months_per_period"],
            "term": data["term_months"],
            "start": data["start_date"],
            "warnings": data["warnings"],
        }
    )

with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(report, fh, indent=2, ensure_ascii=False)

ok = [r for r in report if r["status"] == "ok"]
bad = [r for r in report if r["status"] != "ok"]

print(f"{len(report)} Zeilen · {len(ok)} gelesen · {len(bad)} ohne Datenblatt\n")
print(f"{'Objekt':<40} {'Zahl.':>5} {'Stufen':>6} {'Summe':>14} {'Abw.':>9}  Hinweise")
print("-" * 108)

for r in sorted(ok, key=lambda x: x["name"].lower()):
    diff = (r["paid"] - r["stated"]) if r["stated"] is not None else None
    diff_txt = "—" if diff is None else f"{diff:,.2f}"
    notes = "; ".join(r["warnings"])[:34]
    print(
        f"{r['name'][:40]:<40} {r['payments']:>5} {r['steps']:>6} "
        f"{r['paid']:>14,.2f} {diff_txt:>9}  {notes}"
    )

for r in bad:
    print(f"{r['name'][:40]:<40} {'':>5} {'':>6} {'':>14} {'':>9}  {r['status']}")
