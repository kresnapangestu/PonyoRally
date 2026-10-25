"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { getMatchStatus } from "@/domain/scoring";
import { useT } from "@/i18n/useT";
import type { TournamentScreenModel } from "../useTournamentScreen";
import { gameNumber } from "../view-model";

/** Lists the unfinished games of the current round, each with a way to resolve it. */
export function NextRoundSheet({ model }: { model: TournamentScreenModel }) {
  const { t } = useT();
  const { tournament, names, latestRound } = model;
  const round = tournament.rounds[latestRound];
  const pending = round.matches.map((match, index) => ({ match, index })).filter(({ match }) => getMatchStatus(match) === "pending");

  return (
    <Sheet
      open
      onClose={model.closeSheet}
      title={t("tournament.nextRound.sheetTitle", { n: latestRound + 1 })}
      closeLabel={t("common.close")}
    >
      <p className="mb-4 text-text-muted">{t("tournament.nextRound.sheetBody")}</p>
      <ul className="flex flex-col gap-2">
        {pending.map(({ match, index }) => {
          const ref = { round: latestRound, match: index };
          return (
            <li key={index} className="flex flex-col gap-2 rounded-card border border-border p-3">
              <p className="text-sm font-semibold">
                {t("tournament.game", { n: gameNumber(tournament, latestRound, index) })} · {tournament.courts[match.court]}
              </p>
              <p className="text-sm text-text-muted">
                {names.side(match.a)} {t("tournament.vs").toLowerCase()} {names.side(match.b)}
              </p>
              <div className="flex gap-2">
                <Button block onClick={() => model.openSheet({ kind: "score", ref, side: 0 })}>
                  {t("tournament.nextRound.enterScore")}
                </Button>
                <Button block variant="secondary" onClick={() => model.skip(ref)}>
                  {t("tournament.nextRound.skip")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
