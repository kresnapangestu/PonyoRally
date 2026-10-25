import type { MatchStatus } from "@/domain/types";

const STYLES: Record<MatchStatus, { dot: string; text: string }> = {
  pending: { dot: "bg-warning", text: "text-text-muted" },
  complete: { dot: "bg-success", text: "text-primary-soft" },
  skipped: { dot: "border border-text-muted", text: "text-text-muted" },
};

/** Status as a dot plus a word, never color alone. */
export function StatusPill({ status, label }: { status: MatchStatus; label: string }) {
  const style = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold ${style.text}`}>
      <span className={`size-2 rounded-full ${style.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
