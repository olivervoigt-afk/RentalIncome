"use client";

import { useActionState, useRef, type ReactNode } from "react";
import { Button, FormMessage } from "@/components/ui";
import { useDict } from "@/components/dict-provider";
import type { ActionState } from "@/lib/actions/auth";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formular für das Anlegen einzelner Datensätze. Die Felder werden als
 * children übergeben und serverseitig gerendert; nur der Absende-Status
 * lebt im Client.
 */
export default function InlineForm({
  action,
  submitLabel,
  children,
  className = "",
}: {
  action: Action;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useDict();
  const ref = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.success) ref.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={ref} action={formAction} className={`space-y-3 ${className}`}>
      {children}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? t.common.saving : submitLabel}
      </Button>
    </form>
  );
}
