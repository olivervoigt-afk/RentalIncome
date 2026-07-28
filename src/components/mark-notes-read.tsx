"use client";

import { useEffect } from "react";
import { markNotesRead } from "@/lib/actions/notes";

/**
 * Meldet beim Anzeigen, dass die aufgeführten Notizen gelesen wurden.
 * Bewusst ohne Knopf: wer die Notiz auf dem Bildschirm hat, hat sie gesehen.
 */
export default function MarkNotesRead({ ids }: { ids: string[] }) {
  const key = ids.join(",");

  useEffect(() => {
    if (key) void markNotesRead(key.split(","));
  }, [key]);

  return null;
}
