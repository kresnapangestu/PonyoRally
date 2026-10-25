import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode } from "react";

export type NoticeTone = "error" | "warning" | "info";

const TONES: Record<NoticeTone, { icon: typeof InformationCircleIcon; box: string; iconClass: string; text: string }> = {
  error: { icon: ExclamationCircleIcon, box: "bg-danger/10", iconClass: "text-danger", text: "font-medium text-danger" },
  warning: { icon: ExclamationTriangleIcon, box: "bg-warning/10", iconClass: "text-warning", text: "text-text" },
  info: { icon: InformationCircleIcon, box: "bg-surface-2", iconClass: "text-primary-soft", text: "text-text-muted" },
};

/** Inline message in a tinted box with an icon, so meaning never rests on color alone. */
export function Notice({ tone, children, action }: { tone: NoticeTone; children: ReactNode; action?: ReactNode }) {
  const { icon: Icon, box, iconClass, text } = TONES[tone];
  return (
    <div className={`flex w-full animate-fade-in items-start gap-2.5 rounded-input px-3 py-2.5 text-sm ${box}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <p className={`min-w-0 flex-1 leading-snug ${text}`}>{children}</p>
      {action}
    </div>
  );
}
