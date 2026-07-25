"use client";

import Papa from "papaparse";
import Link from "next/link";
import { useState, useTransition } from "react";
import { importProperties, type ImportResult, type ImportRow } from "@/lib/actions/import";
import { Button, Card, CardHeader, Select } from "@/components/ui";

type TargetKey = keyof ImportRow;

type Target = {
  key: TargetKey;
  label: string;
  required?: boolean;
  /** Überschriften, die beim Einlesen automatisch dieser Spalte zugeordnet werden. */
  match: RegExp;
};

const TARGETS: Target[] = [
  { key: "name", label: "Objektname", required: true, match: /objekt|name|immobil|propert/i },
  { key: "location", label: "Standort", match: /standort|ort|location|adress/i },
  { key: "tenant_name", label: "Mieter", match: /mieter|tenant|nutzer/i },
  { key: "start_date", label: "Mietbeginn", required: true, match: /beginn|start|von|ab/i },
  { key: "term_months", label: "Laufzeit (Monate)", required: true, match: /laufzeit|monate|term|dauer/i },
  { key: "payment_frequency", label: "Zahlungsrhythmus", match: /rhythm|frequen|interval|turnus|zyklus/i },
  { key: "amount", label: "Miete pro Zeitraum", match: /miete|betrag|amount|rent|zins/i },
  { key: "ta24", label: "TA24", match: /ta24|ta 24|steuer/i },
];

type Mapping = Partial<Record<TargetKey, string>>;

export default function ImportWizard() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [parseError, setParseError] = useState<string>();
  const [result, setResult] = useState<ImportResult>();
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    setParseError(undefined);
    setResult(undefined);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, meta }) {
        const cols = (meta.fields ?? []).filter(Boolean);

        if (cols.length === 0 || data.length === 0) {
          setParseError("Die Datei enthält keine erkennbaren Spalten oder Zeilen.");
          return;
        }

        // Spalten anhand der Überschriften vorbelegen.
        const guessed: Mapping = {};
        for (const target of TARGETS) {
          const hit = cols.find((col) => target.match.test(col));
          if (hit) guessed[target.key] = hit;
        }

        setHeaders(cols);
        setRows(data);
        setMapping(guessed);
      },
      error(err) {
        setParseError(`Die Datei konnte nicht gelesen werden: ${err.message}`);
      },
    });
  }

  const missing = TARGETS.filter((t) => t.required && !mapping[t.key]);

  function runImport() {
    const payload: ImportRow[] = rows.map((row) => {
      const mapped = {} as ImportRow;
      for (const target of TARGETS) {
        const column = mapping[target.key];
        mapped[target.key] = column ? (row[column] ?? "") : "";
      }
      return mapped;
    });

    startTransition(async () => {
      setResult(await importProperties(payload));
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="1 · CSV-Datei auswählen" />
        <div className="p-5">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-sm"
          />
          {parseError && <p className="mt-3 text-sm text-negative">{parseError}</p>}
          {rows.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              {rows.length} {rows.length === 1 ? "Zeile" : "Zeilen"} und{" "}
              {headers.length} Spalten gelesen.
            </p>
          )}
        </div>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <CardHeader
              title="2 · Spalten zuordnen"
              description="Vorbelegt anhand der Überschriften — bitte prüfen und korrigieren."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {TARGETS.map((target) => (
                <label key={target.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    {target.label}
                    {target.required && <span className="text-negative"> *</span>}
                  </span>
                  <Select
                    value={mapping[target.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [target.key]: e.target.value }))
                    }
                  >
                    <option value="">— nicht zuordnen —</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="3 · Vorschau"
              description={`Die ersten ${Math.min(5, rows.length)} von ${rows.length} Zeilen.`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    {TARGETS.map((t) => (
                      <th key={t.key} className="whitespace-nowrap px-4 py-3 font-medium">
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      {TARGETS.map((t) => {
                        const column = mapping[t.key];
                        const value = column ? row[column] : "";
                        return (
                          <td key={t.key} className="whitespace-nowrap px-4 py-3">
                            {value || <span className="text-muted">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border p-5">
              {missing.length > 0 ? (
                <p className="text-sm text-negative">
                  Pflichtfelder noch nicht zugeordnet:{" "}
                  {missing.map((t) => t.label).join(", ")}
                </p>
              ) : (
                <Button onClick={runImport} disabled={pending}>
                  {pending
                    ? "Import läuft …"
                    : `${rows.length} ${rows.length === 1 ? "Objekt" : "Objekte"} importieren`}
                </Button>
              )}
            </div>
          </Card>
        </>
      )}

      {result && (
        <Card>
          <CardHeader title="Ergebnis" />
          <div className="space-y-3 p-5 text-sm">
            {result.error ? (
              <p className="text-negative">{result.error}</p>
            ) : (
              <>
                <p className="text-positive">
                  {result.imported} {result.imported === 1 ? "Objekt" : "Objekte"} importiert.
                </p>

                {result.skipped && result.skipped.length > 0 && (
                  <div>
                    <p className="font-medium">
                      {result.skipped.length} Zeilen übersprungen:
                    </p>
                    <ul className="mt-1 space-y-0.5 text-muted">
                      {result.skipped.map((s) => (
                        <li key={s.row}>
                          Zeile {s.row} ({s.name}): {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(result.imported ?? 0) > 0 && (
                  <Link href="/objekte" className="inline-block text-accent hover:underline">
                    Zu den Objekten →
                  </Link>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
