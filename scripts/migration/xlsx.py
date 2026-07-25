"""Minimaler xlsx-Leser: liefert je Blatt ein Raster aus Zellwerten.

Bewusst ohne Fremdbibliothek, da die verfuegbaren xlsx-Pakete auf npm/pypi
teils ungepflegt sind. Gelesen werden nur Werte, keine Formeln.
"""
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, timedelta

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
DOC_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def col_to_index(ref):
    """A1 -> 0, B1 -> 1, AA1 -> 26"""
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def row_of(ref):
    return int(re.search(r"(\d+)", ref).group(1))


def serial_to_date(value):
    """Excel-Serienzahl -> date. 1899-12-30 ist der Nullpunkt."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if n < 1 or n > 80000:
        return None
    return date(1899, 12, 30) + timedelta(days=int(n))


class Workbook:
    def __init__(self, path):
        self.zip = zipfile.ZipFile(path)
        self.strings = self._read_strings()
        self.sheets = self._read_sheet_index()

    def _read_strings(self):
        if "xl/sharedStrings.xml" not in self.zip.namelist():
            return []
        root = ET.fromstring(self.zip.read("xl/sharedStrings.xml"))
        out = []
        for si in root.findall(f"{NS}si"):
            out.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
        return out

    def _read_sheet_index(self):
        rels = {}
        root = ET.fromstring(self.zip.read("xl/_rels/workbook.xml.rels"))
        for rel in root:
            rels[rel.get("Id")] = rel.get("Target").lstrip("/")

        sheets = []
        root = ET.fromstring(self.zip.read("xl/workbook.xml"))
        for sheet in root.find(f"{NS}sheets"):
            target = rels[sheet.get(f"{DOC_REL}id")]
            if not target.startswith("xl/"):
                target = "xl/" + target
            sheets.append((sheet.get("name"), target))
        return sheets

    def grid(self, path):
        """Blatt als Liste von Zeilen, jede Zeile eine Liste von Zellwerten."""
        root = ET.fromstring(self.zip.read(path))
        cells = {}
        max_row = max_col = 0

        for c in root.iter(f"{NS}c"):
            ref = c.get("r")
            if not ref:
                continue
            r, col = row_of(ref) - 1, col_to_index(ref)
            t = c.get("t")

            if t == "s":
                v = c.find(f"{NS}v")
                value = self.strings[int(v.text)] if v is not None else ""
            elif t == "inlineStr":
                is_el = c.find(f"{NS}is")
                value = "".join(x.text or "" for x in is_el.iter(f"{NS}t")) if is_el is not None else ""
            else:
                v = c.find(f"{NS}v")
                value = v.text if v is not None else ""

            if value not in (None, ""):
                cells[(r, col)] = value.strip() if isinstance(value, str) else value
                max_row, max_col = max(max_row, r), max(max_col, col)

        return [
            [cells.get((r, c), "") for c in range(max_col + 1)]
            for r in range(max_row + 1)
        ]
