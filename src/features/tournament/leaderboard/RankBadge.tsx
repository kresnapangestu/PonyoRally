import { CrownIcon, MedalIcon } from "@/components/icons/RankIcons";

const TOP: Record<number, { className: string; Icon: typeof CrownIcon }> = {
  1: { className: "bg-accent text-accent-fg", Icon: CrownIcon },
  2: { className: "bg-silver text-silver-fg", Icon: MedalIcon },
  3: { className: "bg-bronze text-bronze-fg", Icon: MedalIcon },
};

/** Crown for 1st, silver and bronze medals for 2nd and 3rd, a plain number after that. */
export function RankBadge({ rank, label }: { rank: number; label: string }) {
  const top = TOP[rank];
  if (!top) {
    return (
      <span
        aria-label={label}
        className="tabular grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-text-muted"
      >
        {rank}
      </span>
    );
  }
  const { className, Icon } = top;
  return (
    <span aria-label={label} className={`relative grid size-9 shrink-0 place-items-center rounded-full ${className}`}>
      <Icon className="size-5" aria-hidden="true" />
      <span className="tabular absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full bg-surface text-[10px] font-extrabold text-text shadow-card">
        {rank}
      </span>
    </span>
  );
}
