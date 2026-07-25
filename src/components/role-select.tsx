"use client";

import { useRef } from "react";
import { updateUserRole } from "@/lib/actions/users";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

/** Rollenwechsel wird direkt bei Auswahl gespeichert. */
export default function RoleSelect({
  id,
  role,
}: {
  id: string;
  role: UserRole;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateUserRole}>
      <input type="hidden" name="id" value={id} />
      <select
        name="role"
        defaultValue={role}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
