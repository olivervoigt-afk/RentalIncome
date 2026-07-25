"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/actions/auth";
import { Button, Card, Field, FormMessage, Input } from "@/components/ui";

export default function LoginForm() {
  const params = useSearchParams();
  const next = params.get("weiter") ?? "/";
  const [state, action, pending] = useActionState<ActionState, FormData>(
    signIn,
    {},
  );

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="weiter" value={next} />

        <Field label="E-Mail-Adresse">
          <Input
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
        </Field>

        <Field label="Passwort">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <FormMessage state={state} />

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Wird angemeldet …" : "Anmelden"}
        </Button>

        <p className="text-center text-xs text-muted">
          Du bleibst auf diesem Rechner dauerhaft angemeldet, bis du dich
          aktiv abmeldest.
        </p>
      </form>
    </Card>
  );
}
