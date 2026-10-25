"use client";

import { MatchMenuSheet } from "./matches/MatchMenuSheet";
import { NextRoundSheet } from "./matches/NextRoundSheet";
import { ScoreSheet } from "./matches/ScoreSheet";
import { SubstituteSheet } from "./matches/SubstituteSheet";
import { TournamentMenuSheet } from "./TournamentMenuSheet";
import type { TournamentScreenModel } from "./useTournamentScreen";
import { gameNumber } from "./view-model";

/** Renders whichever sheet is open; only one at a time. */
export function TournamentSheets({ model }: { model: TournamentScreenModel }) {
  const { sheet, tournament, names } = model;
  if (!sheet) return null;

  switch (sheet.kind) {
    case "score": {
      const match = tournament.rounds[sheet.ref.round].matches[sheet.ref.match];
      return (
        <ScoreSheet
          key={`${sheet.ref.round}-${sheet.ref.match}`}
          match={match}
          gameNumber={gameNumber(tournament, sheet.ref.round, sheet.ref.match)}
          rule={tournament}
          names={names}
          startSide={sheet.side}
          onSave={(score) => model.saveScore(sheet.ref, score)}
          onClose={model.closeSheet}
        />
      );
    }
    case "matchMenu": {
      const ref = sheet.ref;
      return (
        <MatchMenuSheet
          match={tournament.rounds[ref.round].matches[ref.match]}
          gameNumber={gameNumber(tournament, ref.round, ref.match)}
          onSubstitute={() => model.openSheet({ kind: "substitute", ref })}
          onSkip={() => model.skip(ref)}
          onUnskip={() => model.unskip(ref)}
          onClearScore={() => model.clearScore(ref)}
          onClose={model.closeSheet}
        />
      );
    }
    case "substitute":
      return (
        <SubstituteSheet
          tournament={tournament}
          roundIndex={sheet.ref.round}
          matchIndex={sheet.ref.match}
          names={names}
          onClose={model.closeSheet}
        />
      );
    case "nextRound":
      return <NextRoundSheet model={model} />;
    case "tournamentMenu":
      return <TournamentMenuSheet model={model} />;
  }
}
