import { describe, expect, it } from "vitest";
import { teamCapacity } from "../../capacity";
import {
  byeCount,
  byeSpread,
  expectValidRound,
  opponentRepeats,
  play,
  teamsOf,
  tournament,
} from "../__fixtures__/simulate";
import { generateRound } from "../index";

const teamTournament = (teams: number, courts: number) =>
  tournament("teamAmericano", teams * 2, courts, { teams: teamsOf(teams * 2) });

describe("Team Americano", () => {
  const cases = [];
  for (let teams = 2; teams <= 12; teams++) {
    for (let courts = 1; courts <= 4; courts++) cases.push([teams, courts]);
  }

  it.each(cases)("%i teams on %i courts: valid rounds, fair team byes", (teams, courts) => {
    const t = play(teamTournament(teams, courts), 8);
    const capacity = teamCapacity(teams, courts);
    for (const round of t.rounds) {
      expectValidRound(t, round);
      expect(round.byes).toHaveLength(capacity.byes);
    }
    expect(byeSpread(t)).toBeLessThanOrEqual(1);
  });

  it("keeps every pair together in every match", () => {
    const t = play(teamTournament(6, 3), 5);
    const pairs = new Map(t.teams!.map((team) => [team.id, team.players.join("+")]));
    for (const match of t.rounds.flatMap((r) => r.matches)) {
      expect(match.a.p.join("+")).toBe(pairs.get(match.a.t!));
      expect(match.b.p.join("+")).toBe(pairs.get(match.b.t!));
    }
  });

  it("8 teams on 4 courts: no rematch in 7 rounds", () => {
    expect(opponentRepeats(play(teamTournament(8, 4), 7))).toBe(0);
  });

  it("5 teams on 2 courts: 5 rounds, each team rests once, no rematch", () => {
    const t = play(teamTournament(5, 2), 5);
    expect(opponentRepeats(t)).toBe(0);
    for (const team of t.teams!) expect(byeCount(t, team.id)).toBe(1);
  });

  it("rests a team whose member is unavailable", () => {
    const t = teamTournament(4, 2);
    const result = generateRound(t, { out: ["p1"] });
    if (!result.ok) throw new Error(result.reason);
    const playingTeams = result.round.matches.flatMap((m) => [m.a.t, m.b.t]);
    expect(playingTeams).not.toContain("t1");
  });

  it("refuses with fewer than two available teams", () => {
    expect(generateRound(teamTournament(2, 1), { out: ["p3"] })).toEqual({
      ok: false,
      reason: "notEnoughPlayers",
    });
  });
});
