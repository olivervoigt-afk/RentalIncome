"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/auth";
import { Button, Field, FormMessage, Input } from "@/components/ui";
import { useDict } from "@/components/dict-provider";

export default function ChangePasswordForm() {
  const { t } = useDict();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    changePassword,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.settings.newPassword} hint={t.settings.minChars}>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <Field label={t.settings.repeatPassword}>
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
        {pending ? t.settings.changingPassword : t.settings.submitPassword}
      </Button>
    </form>
  );
}
