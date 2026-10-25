import type { ID, Match, Team } from "../../types";

/** Turns a flat arrangement into matches; court index = position / perCourt. */

export function doublesMatches(arrangement: readonly ID[]): Match[] {
  const matches: Match[] = [];
  for (let i = 0; i < arrangement.length; i += 4) {
    matches.push({
      court: i / 4,
      a: { p: [arrangement[i], arrangement[i + 1]] },
      b: { p: [arrangement[i + 2], arrangement[i + 3]] },
    });
  }
  return matches;
}

export function singlesMatches(arrangement: readonly ID[]): Match[] {
  const matches: Match[] = [];
  for (let i = 0; i < arrangement.length; i += 2) {
    matches.push({ court: i / 2, a: { p: [arrangement[i]] }, b: { p: [arrangement[i + 1]] } });
  }
  return matches;
}

export function teamMatches(arrangement: readonly ID[], teams: readonly Team[]): Match[] {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const side = (teamId: ID) => ({ p: [...byId.get(teamId)!.players], t: teamId });

  const matches: Match[] = [];
  for (let i = 0; i < arrangement.length; i += 2) {
    matches.push({ court: i / 2, a: side(arrangement[i]), b: side(arrangement[i + 1]) });
  }
  return matches;
}
