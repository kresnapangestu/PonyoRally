import { describe, expect, it } from "vitest";
import { teamCapacity } from "../../capacity";
import { round } from "../../__fixtures__/tournament";
import { byeSpread, expectValidRound, play, teamsOf, tournament } from "../__fixtures__/simulate";
import { buildHistory } from "../shared/history";
import { generateRound } from "../index";
import { swissPairs } from "./teamMexicano";

const teamTournament = (teams: number, courts: number) =>
  tournament("teamMexicano", teams * 2, courts, { teams: teamsOf(teams * 2) });

const teamMatch = (a: string, b: string, s: [number, number] = [12, 12]) => ({
  court: 0,
  a: { p: [], t: a },
  b: { p: [], t: b },
  s,
});

describe("Team Mexicano — invariants", () => {
  const cases = [];
  for (let teams = 2; teams <= 12; teams++) {
    for (let courts = 1; courts <= 4; courts++) cases.push([teams, courts]);
  }

  it.each(cases)("%i teams on %i courts: valid rounds, fair team byes", (teams, courts) => {
    const t = play(teamTournament(teams, courts), 8);
    const capacity = teamCapacity(teams, courts);
    for (const r of t.rounds) {
      expectValidRound(t, r);
      expect(r.byes).toHaveLength(capacity.byes);
    }
    expect(byeSpread(t)).toBeLessThanOrEqual(1);
  });
});

describe("swissPairs", () => {
  it("pairs neighbors in the ranking", () => {
    expect(swissPairs(["A", "B", "C", "D"], buildHistory([], "team"))).toEqual(["A", "B", "C", "D"]);
  });

  it("skips to the next team that has not been met", () => {
    const history = buildHistory([round([teamMatch("A", "B")])], "team");
    expect(swissPairs(["A", "B", "C", "D"], history)).toEqual(["A", "C", "B", "D"]);
  });

  it("allows a rematch with the nearest team when no fresh opponent is left", () => {
    const history = buildHistory(
      [round([teamMatch("C", "D")]), round([teamMatch("A", "B")]), round([teamMatch("A", "C"), teamMatch("B", "D")])],
      "team",
    );
    // A has met B and C → plays D. Then B and C remain: they have not met.
    expect(swissPairs(["A", "B", "C", "D"], history)).toEqual(["A", "D", "B", "C"]);
    // With everything played, nearest rank wins.
    const all = buildHistory(
      [round([teamMatch("A", "B"), teamMatch("C", "D")]), round([teamMatch("A", "C"), teamMatch("B", "D")]), round([teamMatch("A", "D"), teamMatch("B", "C")])],
      "team",
    );
    expect(swissPairs(["A", "B", "C", "D"], all)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("Team Mexicano — ranking", () => {
  it("puts the top two teams on Court 1 after round one", () => {
    const base = teamTournament(4, 2);
    const result = generateRound({
      ...base,
      rounds: [
        round([
          { court: 0, a: { p: ["p1", "p2"], t: "t1" }, b: { p: ["p3", "p4"], t: "t2" }, s: [4, 20] },
          { court: 1, a: { p: ["p5", "p6"], t: "t3" }, b: { p: ["p7", "p8"], t: "t4" }, s: [18, 6] },
        ]),
      ],
    });
    if (!result.ok) throw new Error(result.reason);
    // Ranking t2 (20), t3 (18), t4 (6), t1 (4).
    expect(result.round.matches[0]).toMatchObject({ court: 0, a: { t: "t2" }, b: { t: "t3" } });
    expect(result.round.matches[1]).toMatchObject({ a: { t: "t4" }, b: { t: "t1" } });
  });
});
