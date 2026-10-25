"use client";

import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useEffect } from "react";
import { useToastStore } from "@/store/toast-store";

const VISIBLE_MS = 3500;
/** Longer when there is an Undo button, so there is time to reach it. */
const VISIBLE_WITH_ACTION_MS = 6000;

/**
 * Snackbar above the bottom bars: full width inside the app frame, even
 * padding, announced to screen readers. The effect only runs the
 * auto-dismiss timer.
 */
export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-[440px] px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex min-h-13 w-full animate-pop-in items-center gap-3 rounded-button bg-text px-4 py-2 text-bg shadow-sheet"
        >
          <CheckCircleIcon className="size-5 shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm leading-snug font-semibold">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                dismiss(toast.id);
              }}
              className="-mr-2 min-h-11 shrink-0 rounded-button px-3 text-sm font-bold text-accent active:bg-bg/10"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
