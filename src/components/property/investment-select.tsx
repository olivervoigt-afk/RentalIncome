"use client";

import { useRef } from "react";
import { useDict } from "@/components/dict-provider";
import { Select } from "@/components/ui";
import { assignInvestment } from "@/lib/actions/investments";

/**
 * Zuordnung des Mietvertrags zu einer Investition. Speichert sofort bei
 * der Auswahl — für ein einzelnes Feld wäre ein Absendeknopf ein Umweg.
 */
export default function InvestmentSelect({
  propertyId,
  current,
  options,
}: {
  propertyId: string;
  current: string | null;
  options: { id: string; name: string }[];
}) {
  const { t } = useDict();
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={assignInvestment} className="flex items-center gap-2">
      <input type="hidden" name="property_id" value={propertyId} />
      <Select
        name="investment_id"
        defaultValue={current ?? ""}
        onChange={() => form.current?.requestSubmit()}
        className="max-w-xs"
      >
        <option value="">{t.yield.unassigned}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
