"use client";

import { Notice } from "@/components/ui/Notice";
import { useT } from "@/i18n/useT";
import type { TournamentScreenModel } from "../useTournamentScreen";
import { gameNumber, relevantNotes } from "../view-model";
import { MatchCard } from "./MatchCard";

export function MatchesTab({ model }: { model: TournamentScreenModel }) {
  const { t } = useT();
  const { tournament, names, roundIndex, latestRound } = model;
  const round = tournament.rounds[roundIndex];
  const isLatest = roundIndex === latestRound;

  const resting = round.byes.map(names.entry);
  const notPlaying = round.out.map(names.player);
  const notes = isLatest ? relevantNotes(tournament, model.notes) : [];

  return (
    <div className="flex flex-col gap-3">
      {latestRound > 0 && (
        <div
          role="radiogroup"
          aria-label={t("tournament.roundsLabel")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {tournament.rounds.map((_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === roundIndex}
              onClick={() => model.viewRound(i === latestRound ? null : i)}
              className="min-h-10 shrink-0 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors duration-120 aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-fg"
            >
              {t("tournament.round", { n: i + 1 })}
            </button>
          ))}
        </div>
      )}

      {!isLatest && <Notice tone="info">{t("tournament.pastRound")}</Notice>}
      {notes.map((note) => (
        <Notice key={note} tone="info">
          {t(`tournament.notes.${note as "partnerRepeat" | "opponentRepeat" | "emptyCourts"}`)}
        </Notice>
      ))}

      <ol className="flex flex-col gap-3">
        {round.matches.map((match, i) => {
          const ref = { round: roundIndex, match: i };
          return (
            <li key={`${roundIndex}-${i}-${round.attempt}`}>
              <MatchCard
                match={match}
                gameNumber={gameNumber(tournament, roundIndex, i)}
                courtName={tournament.courts[match.court]}
                names={names}
                readOnly={model.finished}
                onScore={(side) => model.openSheet({ kind: "score", ref, side })}
                onMenu={() => model.openSheet({ kind: "matchMenu", ref })}
                delayMs={i * 40}
              />
            </li>
          );
        })}
      </ol>

      {resting.length > 0 && (
        <p className="text-sm text-text-muted">
          <span className="font-semibold">{t("tournament.resting")}:</span> {resting.join(", ")}
        </p>
      )}
      {notPlaying.length > 0 && (
        <p className="text-sm text-text-muted">
          <span className="font-semibold">{t("tournament.notPlaying")}:</span> {notPlaying.join(", ")}
        </p>
      )}
    </div>
  );
}
