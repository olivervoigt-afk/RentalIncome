"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/auth";
import { Button, Field, FormMessage, Input } from "@/components/ui";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    changePassword,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Neues Passwort" hint="Mindestens 8 Zeichen.">
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <Field label="Neues Passwort wiederholen">
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
      </div>

      <FormMessage state={state} />

      <Button type="submit" disabled={pending}>
        {pending ? "Wird geändert …" : "Passwort ändern"}
      </Button>
    </form>
  );
}
