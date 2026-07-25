"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useDict } from "@/components/dict-provider";

/**
 * Löschaktion mit Rückfrage in einem eigenen Dialog.
 *
 * Bewusst kein window.confirm(): das wird in eingebetteten Browser-Ansichten
 * teils unterdrückt und liefert dann stillschweigend "abgebrochen" zurück.
 *
 * Ist confirmWord gesetzt, muss der Text zusätzlich abgetippt werden.
 */
export default function DangerAction({
  action,
  fields,
  trigger,
  title,
  description,
  confirmLabel,
  confirmWord,
  triggerClassName = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  trigger: string;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmWord?: string;
  triggerClassName?: string;
}) {
  const { t } = useDict();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ready = !confirmWord || typed.trim() === confirmWord.trim();

  function close() {
    setOpen(false);
    setTyped("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ||
          "text-sm text-muted transition-colors hover:text-negative"
        }
      >
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{description}</p>

            <p className="mt-3 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
              {t.common.irreversible}
            </p>

            {confirmWord && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm">
                  {t.common.confirmType(confirmWord)}
                </span>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </label>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
              >
                {t.common.cancel}
              </button>

              <form action={action}>
                {Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <SubmitButton disabled={!ready} label={t.common.deleting}>
                  {confirmLabel ?? t.common.deleteFinally}
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton({
  disabled,
  label,
  children,
}: {
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type="submit"
      disabled={disabled || pending}
      className="rounded-md bg-negative px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? label : children}
    </button>
  );
}
