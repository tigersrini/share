"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/lib/form";
import { Button } from "./ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * <form> bound to a Server Action that may return { error } / { ok }.
 * Shows the message inline and (optionally) clears the form on success.
 */
export default function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel,
  resetOnSuccess = false,
  className = "",
  submitVariant = "primary",
  hideSubmit = false,
  footer,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  submitVariant?: "primary" | "secondary" | "danger" | "sun";
  hideSubmit?: boolean;
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && !state.error && <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-strong">{state.ok}</p>}
      {!hideSubmit && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit" variant={submitVariant} disabled={pending}>
            {pending ? (pendingLabel ?? "Saving…") : submitLabel}
          </Button>
          {footer}
        </div>
      )}
    </form>
  );
}
