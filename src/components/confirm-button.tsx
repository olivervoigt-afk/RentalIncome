"use client";

import { useFormStatus } from "react-dom";

/** Absende-Button mit Rückfrage, für löschende Aktionen. */
export default function ConfirmButton({
  message,
  children,
  className = "",
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
      className={`text-sm text-muted transition-colors hover:text-negative disabled:opacity-50 ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
