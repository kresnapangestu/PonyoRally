import { teamCapacity } from "../../capacity";
import type { ID } from "../../types";
import type { EngineResult, FormatEngine } from "../types";
import { teamMatches } from "../shared/build";
import { selectByes } from "../shared/byes";
import type { History } from "../shared/history";
import { rankedIds, timesMet } from "../shared/ranking";
import { shuffle } from "../shared/rng";
import { repeatNotes } from "../shared/schedule";

/**
 * Swiss-style pairing: going down the ranking, each team plays the highest
 * ranked team it has not met yet. If it has met everyone left, it plays the
 * nearest-ranked team (a rematch). Returns [A, B, A, B, …], top pair first.
 */
export function swissPairs(ranked: readonly ID[], history: History): ID[] {
  const remaining = [...ranked];
  const arrangement: ID[] = [];
  while (remaining.length >= 2) {
    const team = remaining.shift()!;
    const freshIndex = remaining.findIndex((other) => timesMet(history, team, other) === 0);
    const [opponent] = remaining.splice(freshIndex === -1 ? 0 : freshIndex, 1);
    arrangement.push(team, opponent);
  }
  return arrangement;
}

/** Team Mexicano: fixed pairs, opponents chosen from the current team ranking. */
export const teamMexicano: FormatEngine = {
  id: "teamMexicano",
  generate(ctx): EngineResult {
    const courts = ctx.t.courts.length;
    const entries = ctx.teams.map((team) => team.id);
    const capacity = teamCapacity(entries.length, courts);
    if (capacity.courtsUsed === 0) return { ok: false, reason: "notEnoughPlayers" };

    const byes = selectByes(entries, capacity.byes, ctx.history, ctx.rng);
    const resting = new Set(byes);
    const playing = entries.filter((id) => !resting.has(id));
    const arrangement =
      ctx.roundIndex === 0 ? shuffle(playing, ctx.rng) : swissPairs(rankedIds(ctx, playing), ctx.history);

    return {
      ok: true,
      round: { matches: teamMatches(arrangement, ctx.teams), byes },
      notes: repeatNotes(ctx.history, arrangement, 2, capacity.courtsUsed, courts),
    };
  },
};
