"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Bottom sheet on the native <dialog>: focus trap, Esc to close and focus
 * return come from the browser. The effect only mirrors `open` onto the
 * dialog element, an external DOM API.
 */
export function Sheet({ open, onClose, title, closeLabel, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // tap on the backdrop
      }}
      className="fixed inset-x-0 bottom-0 m-0 mx-auto mt-auto max-h-[88dvh] w-full max-w-[440px] flex-col rounded-t-sheet bg-surface p-0 text-text shadow-sheet backdrop:bg-black/45 open:flex open:animate-sheet-in"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border py-2 pr-2 pl-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="grid size-12 place-items-center rounded-button text-text-muted active:bg-surface-2"
        >
          <XMarkIcon className="size-6" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      {footer && (
        <div className="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
      )}
    </dialog>
  );
}
