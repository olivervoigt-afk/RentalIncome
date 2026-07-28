"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const TAKT_MS = 15_000;

/**
 * Hält die Seite aktuell, ohne dass jemand neu laden muss.
 *
 * Statt die Seite im Takt neu zu bauen, wird nur eine winzige Kennzahl
 * abgefragt. Erst wenn die sich ändert, lädt Next die Serverkomponenten neu —
 * andernfalls liefe alle paar Sekunden die Auswertung über alle Zahlungen mit.
 *
 * Zusätzlich beim Zurückkehren in den Tab: wer eine Weile weg war, erwartet
 * beim Hinschauen den aktuellen Stand.
 */
export default function LiveRefresh() {
  const router = useRouter();
  const letzte = useRef<string | null>(null);

  useEffect(() => {
    let abgemeldet = false;

    async function pruefen() {
      if (abgemeldet || document.visibilityState !== "visible") return;

      try {
        const antwort = await fetch("/notizen/puls", { cache: "no-store" });
        if (!antwort.ok) return;

        const { unread, latest } = await antwort.json();
        const kennzahl = `${unread}|${latest ?? ""}`;

        // Der erste Durchlauf legt nur den Ausgangswert fest.
        if (letzte.current !== null && letzte.current !== kennzahl) {
          router.refresh();
        }
        letzte.current = kennzahl;
      } catch {
        // Ein verlorener Takt ist belanglos; der nächste kommt gleich.
      }
    }

    const takt = setInterval(pruefen, TAKT_MS);
    document.addEventListener("visibilitychange", pruefen);
    window.addEventListener("focus", pruefen);
    void pruefen();

    return () => {
      abgemeldet = true;
      clearInterval(takt);
      document.removeEventListener("visibilitychange", pruefen);
      window.removeEventListener("focus", pruefen);
    };
  }, [router]);

  return null;
}
