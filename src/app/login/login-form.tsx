"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/actions/auth";
import { Button, Card, Field, FormMessage, Input } from "@/components/ui";
import type { Dict } from "@/lib/i18n/dictionaries";

export default function LoginForm({ t }: { t: Dict }) {
  const params = useSearchParams();
  const next = params.get("weiter") ?? "/";
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="weiter" value={next} />

        <Field label={t.login.email}>
          <Input name="email" type="email" autoComplete="username" required autoFocus />
        </Field>

        <Field label={t.login.password}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>

        <FormMessage state={state} />

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.login.pending : t.login.submit}
        </Button>

        <p className="text-center text-xs text-muted">{t.login.stayNote}</p>
      </form>
    </Card>
  );
}
