"use client";

import { useActionState } from "react";
import { resetUserPassword } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/auth";
import { useDict } from "@/components/dict-provider";

/** Setzt für einen anderen Benutzer ein neues Basispasswort. */
export default function ResetPasswordForm({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const { t } = useDict();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resetUserPassword,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="password"
        type="text"
        minLength={8}
        required
        placeholder={t.users.newPassword}
        aria-label={`${t.users.newPassword} — ${name}`}
        className="w-40 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-muted disabled:opacity-50"
      >
        {pending ? "…" : t.users.set}
      </button>
      {state.error && <span className="text-xs text-negative">{state.error}</span>}
      {state.success && <span className="text-xs text-positive">✓</span>}
    </form>
  );
}
