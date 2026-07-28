"use client";

import { useActionState } from "react";
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
import { useDict } from "@/components/dict-provider";
import type { Location, Property } from "@/lib/types";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export default function PropertyForm({
  action,
  property,
  locations,
  showInitialRent = false,
}: {
  action: Action;
  property?: Property;
  locations: Location[];
  /** Beim Anlegen kann direkt die erste Miete miterfasst werden. */
  showInitialRent?: boolean;
}) {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {property && <input type="hidden" name="id" value={property.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.form.name}>
          <Input name="name" required defaultValue={property?.name} autoFocus />
        </Field>

        <Field
          label={t.form.location}
          hint={t.form.locationHint}
        >
          <Select name="location_id" defaultValue={property?.location_id ?? ""}>
            <option value="">{t.form.noLocation}</option>
            {locations
              .filter((l) => l.active || l.id === property?.location_id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
        </Field>

        <Field label={t.form.tenant}>
          <Input name="tenant_name" defaultValue={property?.tenant_name} />
        </Field>

        <Field label={t.form.frequency}>
          <Select
            name="payment_frequency"
            defaultValue={property?.payment_frequency ?? "monthly"}
          >
            {Object.entries(t.frequency).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={t.form.start}
          hint={t.form.startHint}
        >
          <Input
            name="start_date"
            type="date"
            required
            defaultValue={property?.start_date}
          />
        </Field>

        <Field label={t.form.term}>
          <Input
            name="term_months"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={property?.term_months ?? 12}
          />
        </Field>

        {showInitialRent && (
          <Field
            label={t.form.initialRent}
            hint={t.form.initialRentHint}
          >
            <Input name="amount" inputMode="decimal" placeholder="1250,00" />
          </Field>
        )}

        <Field label={t.deposits.agreed} hint={t.deposits.agreedHint}>
          <Input
            name="deposit_amount"
            inputMode="decimal"
            placeholder="2500,00"
            defaultValue={
              property?.deposit_amount ? String(property.deposit_amount) : ""
            }
          />
        </Field>
      </div>

      <Field label={t.form.notes}>
        <Textarea name="notes" rows={3} defaultValue={property?.notes} />
      </Field>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="ta24"
          defaultChecked={property?.ta24}
          className="size-4 rounded border-border accent-accent"
        />
        <span>
          <span className="font-medium">{t.form.ta24Label}</span>
          <span className="text-muted">{t.form.ta24Hint}</span>
        </span>
      </label>

      <FormMessage state={state} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : property ? t.form.saveChanges : t.form.create}
        </Button>
        <ButtonLink
          href={property ? `/objekte/${property.id}` : "/"}
          variant="secondary"
        >
          {t.common.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}
