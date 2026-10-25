import { CrownIcon } from "@/components/icons/RankIcons";
import type { StandingRow } from "@/domain/standings";

const PLACE = {
  1: { ring: "ring-accent", pedestal: "h-24 bg-accent text-accent-fg", delay: "120ms" },
  2: { ring: "ring-silver", pedestal: "h-16 bg-silver text-silver-fg", delay: "0ms" },
  3: { ring: "ring-bronze", pedestal: "h-11 bg-bronze text-bronze-fg", delay: "60ms" },
} as const;

/** "Nina" → "N", "Iren & BUNA" → "IB". */
function initials(name: string) {
  return name
    .split(/\s*&\s*|\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface PodiumProps {
  rows: StandingRow[];
  name: (id: string) => string;
  pointsLabel: string;
}

/** Top three, laid out 2 – 1 – 3 with pedestals rising from the bottom. */
export function Podium({ rows, name, pointsLabel }: PodiumProps) {
  const order = [rows[1], rows[0], rows[2]].filter((row): row is StandingRow => Boolean(row));

  return (
    <ol className="grid grid-cols-3 items-end gap-2">
      {order.map((row) => {
        const place = PLACE[Math.min(row.rank, 3) as 1 | 2 | 3];
        const first = row.rank === 1;
        return (
          <li key={row.id} className="flex flex-col items-center gap-1.5 text-center">
            {first && <CrownIcon className="size-7 animate-pop-in text-accent" aria-hidden="true" />}
            <span
              className={`grid place-items-center rounded-full bg-on-brand/10 font-bold text-on-brand ring-2 ${place.ring} ${
                first ? "size-16 text-xl" : "size-12 text-base"
              }`}
              aria-hidden="true"
            >
              {initials(name(row.id))}
            </span>
            <p className="line-clamp-2 min-h-10 text-sm leading-tight font-bold text-on-brand">{name(row.id)}</p>
            <p className="tabular text-on-brand-muted text-xs">
              <span className="text-lg font-extrabold text-on-brand">{row.points}</span> {pointsLabel}
            </p>
            <div
              className={`flex w-full origin-bottom animate-rise items-start justify-center rounded-t-button pt-1.5 text-lg font-extrabold ${place.pedestal}`}
              style={{ animationDelay: place.delay }}
            >
              {row.rank}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
