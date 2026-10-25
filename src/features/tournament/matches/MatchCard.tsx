"use client";

import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { StatusPill } from "@/components/ui/StatusPill";
import { getMatchStatus, getWinner } from "@/domain/scoring";
import type { Match } from "@/domain/types";
import { useT } from "@/i18n/useT";
import type { Names } from "../view-model";

interface MatchCardProps {
  match: Match;
  gameNumber: number;
  courtName: string;
  names: Names;
  readOnly: boolean;
  onScore: (side: 0 | 1) => void;
  onMenu: () => void;
  delayMs: number;
}

export function MatchCard({ match, gameNumber, courtName, names, readOnly, onScore, onMenu, delayMs }: MatchCardProps) {
  const { t } = useT();
  const status = getMatchStatus(match);
  const winner = getWinner(match);

  return (
    <article
      className={`animate-step-in overflow-hidden rounded-card bg-surface shadow-card ${
        status === "skipped" ? "border-2 border-dashed border-border opacity-70" : ""
      }`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <header className="flex items-center gap-2 py-1 pr-1 pl-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-muted">
          <span className="text-text">{t("tournament.game", { n: gameNumber })}</span> · {courtName}
        </p>
        <StatusPill status={status} label={t(`tournament.status.${status}`)} />
        {!readOnly && (
          <button
            type="button"
            onClick={onMenu}
            aria-label={t("tournament.match.options", { n: gameNumber })}
            className="grid size-11 place-items-center rounded-button text-text-muted active:bg-surface-2"
          >
            <EllipsisHorizontalIcon className="size-6" aria-hidden="true" />
          </button>
        )}
      </header>

      {([0, 1] as const).map((side) => {
        const sideData = side === 0 ? match.a : match.b;
        const name = names.side(sideData);
        const score = match.s?.[side];
        const won = winner === side;
        return (
          <div key={side} className={`relative flex items-center gap-3 px-4 ${side === 0 ? "pb-1" : "pt-1 pb-3"}`}>
            {won && <span className="absolute inset-y-1 left-0 w-1.5 rounded-r-full bg-accent" aria-hidden="true" />}
            <p className={`min-w-0 flex-1 text-base leading-snug ${won ? "font-bold" : "font-semibold"}`}>{name}</p>
            <button
              type="button"
              disabled={readOnly || status === "skipped"}
              onClick={() => onScore(side)}
              aria-label={t("tournament.match.scoreFor", {
                name,
                score: score ?? t("tournament.match.noScore"),
              })}
              className={`tabular grid h-14 min-w-16 place-items-center rounded-button px-3 text-3xl font-extrabold transition-transform duration-120 active:scale-95 disabled:active:scale-100 ${
                score === undefined ? "border-2 border-dashed border-border text-text-muted/50" : "bg-surface-2"
              } ${won ? "text-primary" : ""}`}
            >
              <span key={score ?? "empty"} className="animate-pop-in">
                {score ?? "–"}
              </span>
            </button>
          </div>
        );
      })}
    </article>
  );
}
