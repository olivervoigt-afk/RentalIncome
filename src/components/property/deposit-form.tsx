"use client";

import { useState } from "react";
import InlineForm from "@/components/inline-form";
import { Field, Input, Select } from "@/components/ui";
import { addDeposit } from "@/lib/actions/deposits";
import type { Dict } from "@/lib/i18n/dictionaries";
import { toISODate } from "@/lib/rent";
import type { DepositKind, PaymentSource } from "@/lib/types";

/**
 * Die Verrechnung gegen einen Mietrückstand betrifft nur den Einbehalt.
 * Deshalb lebt die Auswahl der Art im Client — alles Weitere bleibt Formular.
 */
export default function DepositForm({
  t,
  propertyId,
  sources,
}: {
  t: Dict;
  propertyId: string;
  sources: PaymentSource[];
}) {
  const [kind, setKind] = useState<DepositKind>("received");

  return (
    <InlineForm action={addDeposit} submitLabel={t.deposits.record}>
      <input type="hidden" name="property_id" value={propertyId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t.deposits.kind}>
          <Select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as DepositKind)}
          >
            <option value="received">{t.deposits.kindReceived}</option>
            <option value="refunded">{t.deposits.kindRefunded}</option>
            <option value="retained">{t.deposits.kindRetained}</option>
          </Select>
        </Field>

        <Field label={t.common.date}>
          <Input
            name="happened_on"
            type="date"
            required
            defaultValue={toISODate(new Date())}
          />
        </Field>

        <Field label={t.common.amount}>
          <Input name="amount" inputMode="decimal" required placeholder="2500,00" />
        </Field>

        <Field label={t.common.source}>
          <Select name="source_id" defaultValue="">
            <option value="">{t.common.none}</option>
            {sources
              .filter((source) => source.active)
              .map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>

      <Field label={t.common.note}>
        <Input name="note" placeholder={t.deposits.notePlaceholder} />
      </Field>

      {kind === "retained" && (
        <div className="rounded-md border border-border bg-surface-muted/50 p-3">
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="against_rent"
              className="mt-0.5 size-4 rounded border-border accent-accent"
            />
            <span>
              <span className="font-medium">{t.deposits.againstRent}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {t.deposits.againstRentHint}
              </span>
            </span>
          </label>
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
            {t.deposits.retainedHint}
          </p>
        </div>
      )}
    </InlineForm>
  );
}
