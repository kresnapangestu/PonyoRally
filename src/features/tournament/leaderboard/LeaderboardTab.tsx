"use client";

import { ArrowDownIcon, ArrowUpIcon, ShareIcon, TrophyIcon } from "@heroicons/react/20/solid";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { computeStandings, type StandingRow } from "@/domain/standings";
import { useT } from "@/i18n/useT";
import type { TournamentScreenModel } from "../useTournamentScreen";
import { ShareSheet } from "../share/ShareSheet";
import { Podium } from "./Podium";
import { RankBadge } from "./RankBadge";

type View = "compact" | "detail";

/** Rank movement since the previous round, by entry ID (positive = moved up). */
function rankChanges(current: StandingRow[], previous: StandingRow[]) {
  const before = new Map(previous.map((row) => [row.id, row.rank]));
  return new Map(current.map((row) => [row.id, (before.get(row.id) ?? row.rank) - row.rank]));
}

export function LeaderboardTab({ model }: { model: TournamentScreenModel }) {
  const { t, tp } = useT();
  const { tournament, names } = model;
  const [view, setView] = useState<View>("compact");
  const [sharing, setSharing] = useState(false);

  const rows = useMemo(() => computeStandings(tournament), [tournament]);
  const changes = useMemo(
    () => rankChanges(rows, computeStandings(tournament, { throughRound: tournament.rounds.length - 1 })),
    [tournament, rows],
  );

  if (!rows.some((row) => row.played > 0)) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-primary-soft">
          <TrophyIcon className="size-8" aria-hidden="true" />
        </span>
        <p className="text-text-muted">{t("tournament.leaderboard.empty")}</p>
      </div>
    );
  }

  const pointsLabel = t("tournament.leaderboard.points").toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-card bg-brand-surface px-4 pt-4 shadow-card">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-on-brand">
              {model.finished ? t("tournament.leaderboard.champion") : t("tournament.tabs.leaderboard")}
            </h2>
            <p className="text-on-brand-muted text-sm">
              {t("tournament.leaderboard.after", { n: tournament.rounds.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSharing(true)}
            aria-label={t("share.openLabel")}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-accent-fg transition-transform duration-120 active:scale-95"
          >
            <ShareIcon className="size-4.5" aria-hidden="true" />
            {t("share.open")}
          </button>
        </header>
        <Podium rows={rows.slice(0, 3)} name={names.entry} pointsLabel={pointsLabel} />
      </section>

      <Segmented<View>
        label={t("tournament.leaderboard.viewLabel")}
        hideLabel
        value={view}
        onChange={setView}
        options={[
          { value: "compact", label: t("tournament.leaderboard.compact") },
          { value: "detail", label: t("tournament.leaderboard.detail") },
        ]}
      />

      <ol className="divide-y divide-border overflow-hidden rounded-card bg-surface shadow-card">
        {rows.map((row, i) => (
          <Row
            key={row.id}
            row={row}
            above={rows[i - 1]}
            change={changes.get(row.id) ?? 0}
            name={names.entry(row.id)}
            detail={view === "detail"}
            delayMs={Math.min(i, 12) * 30}
            pointsLabel={pointsLabel}
            texts={{ t, tp }}
          />
        ))}
      </ol>

      {sharing && (
        <ShareSheet tournament={tournament} rows={rows} entryName={names.entry} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}

interface RowProps {
  row: StandingRow;
  above: StandingRow | undefined;
  change: number;
  name: string;
  detail: boolean;
  delayMs: number;
  pointsLabel: string;
  texts: Pick<ReturnType<typeof useT>, "t" | "tp">;
}

function Row({ row, above, change, name, detail, delayMs, pointsLabel, texts: { t, tp } }: RowProps) {
  const reason = row.tied
    ? t("tournament.leaderboard.tiedWith", { rank: row.rank })
    : row.separatedBy && row.separatedBy !== "points" && above
      ? t(`tournament.leaderboard.lostOn.${row.separatedBy}`, { rank: above.rank })
      : null;

  return (
    <li
      className={`flex animate-step-in items-center gap-3 px-3 py-3 ${row.rank === 1 ? "bg-accent/15" : ""}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex w-11 shrink-0 flex-col items-center gap-0.5">
        <RankBadge rank={row.rank} label={`${t("tournament.leaderboard.rank")} ${row.rank}`} />
        {change !== 0 && <RankChange change={change} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate leading-tight font-bold ${row.withdrawn ? "text-text-muted line-through" : ""}`}>{name}</p>
        {detail ? (
          <dl className="mt-1.5 grid grid-cols-4 gap-1 text-center">
            <Stat label={t("tournament.leaderboard.played")} value={row.played} />
            <Stat label={t("tournament.leaderboard.wins")} value={row.wins} />
            <Stat label={t("tournament.leaderboard.diff")} value={row.diff > 0 ? `+${row.diff}` : row.diff} />
            <Stat label={t("tournament.leaderboard.byes")} value={row.byes} />
          </dl>
        ) : (
          <p className="mt-0.5 text-xs text-text-muted">
            {tp("tournament.leaderboard.playedCount", row.played)}
            {row.byes > 0 && <> · {tp("tournament.leaderboard.restedCount", row.byes)}</>}
          </p>
        )}
        {reason && <p className="mt-1 text-xs text-text-muted italic">{reason}</p>}
      </div>

      <p className="flex shrink-0 flex-col items-end">
        <span className="tabular text-2xl leading-none font-extrabold">{row.points}</span>
        <span className="text-[11px] text-text-muted">{pointsLabel}</span>
      </p>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-input bg-surface-2 px-1 py-1">
      <dt className="truncate text-[10px] text-text-muted">{label}</dt>
      <dd className="tabular text-sm font-bold">{value}</dd>
    </div>
  );
}

function RankChange({ change }: { change: number }) {
  const { t } = useT();
  const up = change > 0;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={`tabular inline-flex items-center text-[11px] font-bold ${up ? "text-primary-soft" : "text-danger"}`}
      aria-label={t(up ? "tournament.leaderboard.up" : "tournament.leaderboard.down", { n: Math.abs(change) })}
    >
      <Icon className="size-3" aria-hidden="true" />
      {Math.abs(change)}
    </span>
  );
}
