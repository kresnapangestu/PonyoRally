import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel: string;
  actions?: ReactNode;
}

export function TopBar({ title, subtitle, onBack, backLabel, actions }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center gap-1 bg-bg/95 py-1 pr-2 pl-1 backdrop-blur">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="grid size-12 shrink-0 place-items-center rounded-button text-primary-soft active:bg-surface-2"
        >
          <ArrowLeftIcon className="size-6" aria-hidden="true" />
        </button>
      )}
      <div className={`min-w-0 flex-1 ${onBack ? "" : "pl-3"}`}>
        <h1 className="truncate text-lg font-bold">{title}</h1>
        {subtitle && <p className="truncate text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
