"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";

type Value = { t: Dict; locale: Locale };

const DictContext = createContext<Value | null>(null);

/**
 * Stellt Wörterbuch und Sprache für Client-Komponenten bereit. Server
 * Components holen sich beides direkt über getDict().
 */
export function DictProvider({
  value,
  children,
}: {
  value: Value;
  children: ReactNode;
}) {
  return <DictContext.Provider value={value}>{children}</DictContext.Provider>;
}

export function useDict(): Value {
  const value = useContext(DictContext);
  if (!value) {
    throw new Error("useDict benötigt einen DictProvider im Elternbaum.");
  }
  return value;
}
