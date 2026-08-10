"use client";

import { useActionState } from "react";
import { useDict } from "@/components/dict-provider";
import {
  Button,
  ButtonLink,
  Field,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import type { ActionState } from "@/lib/actions/auth";
import type { Investment, Location } from "@/lib/types";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Leere Felder bleiben leer: 0 € und "nicht erfasst" sind nicht dasselbe. */
function value(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

export default function InvestmentForm({
  action,
  investment,
  locations,
}: {
  action: Action;
  investment?: Investment;
  locations: Location[];
}) {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {investment && <input type="hidden" name="id" value={investment.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.yield.name}>
          <Input name="name" required defaultValue={investment?.name} autoFocus />
        </Field>

        <Field label={t.form.location}>
          <Select name="location_id" defaultValue={investment?.location_id ?? ""}>
            <option value="">{t.reports.noLocation}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.yield.purchasedOn}>
          <Input name="purchased_on" type="date" defaultValue={investment?.purchased_on ?? ""} />
        </Field>

        <Field label={t.yield.purchasePrice}>
          <Input
            name="purchase_price"
            inputMode="decimal"
            placeholder="450000,00"
            defaultValue={value(investment?.purchase_price)}
          />
        </Field>

        <Field label={t.yield.costsPercent} hint={t.yield.costsHint}>
          <Input
            name="costs_percent"
            inputMode="decimal"
            placeholder="9,5"
            defaultValue={value(investment?.costs_percent)}
          />
        </Field>

        <Field label={t.yield.costsAmount}>
          <Input
            name="costs_amount"
            inputMode="decimal"
            defaultValue={value(investment?.costs_amount)}
          />
        </Field>

        <Field label={t.yield.annualCosts} hint={t.yield.annualCostsHint}>
          <Input
            name="annual_costs"
            inputMode="decimal"
            defaultValue={value(investment?.annual_costs)}
          />
        </Field>

        <Field label={t.yield.marketRent} hint={t.yield.marketRentHint}>
          <Input
            name="market_rent"
            inputMode="decimal"
            defaultValue={value(investment?.market_rent)}
          />
        </Field>

        <Field label={t.yield.openingValue} hint={t.yield.openingValueHint}>
          <Input
            name="opening_value"
            inputMode="decimal"
            defaultValue={value(investment?.opening_value)}
          />
        </Field>

        <Field label={t.yield.valuation} hint={t.yield.valuationHint}>
          <Input
            name="valuation"
            inputMode="decimal"
            defaultValue={value(investment?.valuation)}
          />
        </Field>

        <Field label={t.yield.valuedOn}>
          <Input name="valued_on" type="date" defaultValue={investment?.valued_on ?? ""} />
        </Field>

        <Field label={t.yield.soldOn} hint={t.yield.soldHint}>
          <Input name="sold_on" type="date" defaultValue={investment?.sold_on ?? ""} />
        </Field>

        <Field label={t.yield.salePrice}>
          <Input
            name="sale_price"
            inputMode="decimal"
            defaultValue={value(investment?.sale_price)}
          />
        </Field>
      </div>

      <Field label={t.form.notes}>
        <Textarea name="notes" rows={3} defaultValue={investment?.notes} />
      </Field>

      <FormMessage state={state} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : investment ? t.form.saveChanges : t.form.create}
        </Button>
        <ButtonLink
          href={investment ? `/rendite/${investment.id}` : "/rendite"}
          variant="secondary"
        >
          {t.common.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}
