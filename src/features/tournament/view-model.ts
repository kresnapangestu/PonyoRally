import { FORMAT_RULES } from "@/constants/formats";
import { displayNames } from "@/domain/roster/display";
import { getMatchStatus } from "@/domain/scoring";
import type { ID, Round, Side, Tournament } from "@/domain/types";

/**
 * Small derived values the tournament screens share. Pure, so components
 * stay focused on layout.
 */

export interface Names {
  player: (id: ID) => string;
  side: (side: Side) => string;
  /** A standings entry: a player, or a team in fixed-team formats. */
  entry: (id: ID) => string;
}

export function buildNames(t: Tournament): Names {
  const players = displayNames(t.players);
  const player = (id: ID) => players.get(id) ?? "?";
  const teams = new Map((t.teams ?? []).map((team) => [team.id, team.players.map(player).join(" & ")]));
  return {
    player,
    side: (side) => side.p.map(player).join(" & "),
    entry: (id) => teams.get(id) ?? player(id),
  };
}

/** Game numbers run across the whole tournament: round 2 starts after round 1's games. */
export function gameNumber(t: Tournament, roundIndex: number, matchIndex: number) {
  return t.rounds.slice(0, roundIndex).reduce((sum, r) => sum + r.matches.length, 0) + matchIndex + 1;
}

export function roundProgress(round: Round) {
  const done = round.matches.filter((m) => getMatchStatus(m) !== "pending").length;
  return { done, total: round.matches.length, resolved: done === round.matches.length };
}

/** Which repeat notes are worth showing: partner repeats for rotating doubles, opponents otherwise. */
export function relevantNotes(t: Tournament, notes: readonly string[]) {
  const rotatingDoubles = t.mode === "doubles" && !FORMAT_RULES[t.format].fixedTeams;
  return notes.filter((note) => note !== (rotatingDoubles ? "opponentRepeat" : "partnerRepeat"));
}
