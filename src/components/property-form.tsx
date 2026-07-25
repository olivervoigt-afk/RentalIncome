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
import { FREQUENCY_LABELS, type Location, type Property } from "@/lib/types";

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
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {property && <input type="hidden" name="id" value={property.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Objektname">
          <Input name="name" required defaultValue={property?.name} autoFocus />
        </Field>

        <Field
          label="Standort"
          hint="Weitere Standorte legt der Administrator in den Einstellungen an."
        >
          <Select name="location_id" defaultValue={property?.location_id ?? ""}>
            <option value="">Ohne Standort</option>
            {locations
              .filter((l) => l.active || l.id === property?.location_id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
        </Field>

        <Field label="Mieter">
          <Input name="tenant_name" defaultValue={property?.tenant_name} />
        </Field>

        <Field label="Zahlungsrhythmus">
          <Select
            name="payment_frequency"
            defaultValue={property?.payment_frequency ?? "monthly"}
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Mietbeginn"
          hint="Bestimmt zugleich den Fälligkeitstag jeder Rate."
        >
          <Input
            name="start_date"
            type="date"
            required
            defaultValue={property?.start_date}
          />
        </Field>

        <Field label="Laufzeit in Monaten">
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
            label="Miete pro Zahlungszeitraum (€)"
            hint="Optional. Weitere Zeiträume kannst du danach als Staffel ergänzen."
          >
            <Input name="amount" inputMode="decimal" placeholder="1250,00" />
          </Field>
        )}
      </div>

      <Field label="Notizen">
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
          <span className="font-medium">TA24</span>
          <span className="text-muted"> — relevant für die Steuererklärung in Malta</span>
        </span>
      </label>

      <FormMessage state={state} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert …" : property ? "Änderungen speichern" : "Objekt anlegen"}
        </Button>
        <ButtonLink
          href={property ? `/objekte/${property.id}` : "/objekte"}
          variant="secondary"
        >
          Abbrechen
        </ButtonLink>
      </div>
    </form>
  );
}
