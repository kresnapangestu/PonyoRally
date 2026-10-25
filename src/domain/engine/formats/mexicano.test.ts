import { describe, expect, it } from "vitest";
import { individualCapacity } from "../../capacity";
import { doublesMatch, makePlayers, round } from "../../__fixtures__/tournament";
import { byeSpread, expectValidRound, play, tournament } from "../__fixtures__/simulate";
import { buildHistory } from "../shared/history";
import { generateRound } from "../index";
import { pairByRank, splitGroup } from "./mexicano";

describe("Mexicano doubles — invariants", () => {
  const cases = [];
  for (let players = 4; players <= 20; players++) {
    for (let courts = 1; courts <= 4; courts++) cases.push([players, courts]);
  }

  it.each(cases)("%i players on %i courts: valid rounds, fair byes", (players, courts) => {
    const t = play(tournament("mexicano", players, courts), 8);
    const capacity = individualCapacity(players, courts, "doubles");
    for (const r of t.rounds) {
      expectValidRound(t, r);
      expect(r.byes).toHaveLength(capacity.byes);
    }
    expect(byeSpread(t)).toBeLessThanOrEqual(1);
  });
});

describe("Mexicano doubles — ranking", () => {
  // After round 1: p1,p2 = 20 · p5,p6 = 14 · p7,p8 = 10 · p3,p4 = 4
  const afterRoundOne = tournament("mexicano", 8, 2, {
    rounds: [
      round([
        doublesMatch(["p1", "p2"], ["p3", "p4"], [20, 4]),
        doublesMatch(["p5", "p6"], ["p7", "p8"], [14, 10], 1),
      ]),
    ],
  });

  it("puts the top four on Court 1 as 1st & 4th vs 2nd & 3rd", () => {
    const result = generateRound(afterRoundOne);
    if (!result.ok) throw new Error(result.reason);
    const [top, second] = result.round.matches;

    expect(top.court).toBe(0);
    expect(top.a.p).toEqual(["p1", "p6"]);
    expect(top.b.p).toEqual(["p2", "p5"]);
    expect(second.a.p).toEqual(["p7", "p4"]);
    expect(second.b.p).toEqual(["p8", "p3"]);
  });

  it("is the same every time for the same results", () => {
    expect(generateRound(afterRoundOne)).toEqual(generateRound(afterRoundOne));
  });

  it("waits for the previous round to be complete", () => {
    const pending = tournament("mexicano", 8, 2, {
      rounds: [round([doublesMatch(["p1", "p2"], ["p3", "p4"], [20, 4]), doublesMatch(["p5", "p6"], ["p7", "p8"])])],
    });
    expect(generateRound(pending)).toEqual({ ok: false, reason: "previousRoundIncomplete" });
  });

  it("re-ranks after a corrected score", () => {
    const corrected = {
      ...afterRoundOne,
      rounds: [
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"], [4, 20]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], [14, 10], 1),
        ]),
      ],
    };
    const result = generateRound(corrected);
    if (!result.ok) throw new Error(result.reason);
    // Now p3,p4 = 20 lead.
    expect(result.round.matches[0].a.p).toContain("p3");
  });
});

describe("splitGroup", () => {
  const group = ["a", "b", "c", "d"];

  it("uses 1st & 4th vs 2nd & 3rd by default", () => {
    expect(splitGroup(group, buildHistory([], "player"))).toEqual(["a", "d", "b", "c"]);
  });

  it("switches split to avoid repeated partners", () => {
    const history = buildHistory([round([doublesMatch(["a", "d"], ["x", "y"], [12, 12])])], "player");
    expect(splitGroup(group, history)).toEqual(["a", "c", "b", "d"]);
  });

  it("falls back to 1st & 2nd vs 3rd & 4th when both balanced splits repeat", () => {
    const history = buildHistory(
      [
        round([doublesMatch(["a", "d"], ["b", "c"], [12, 12])]),
        round([doublesMatch(["a", "c"], ["b", "d"], [12, 12])]),
      ],
      "player",
    );
    expect(splitGroup(group, history)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("Mexicano singles", () => {
  it.each([
    [2, 1],
    [7, 3],
    [10, 2],
  ])("%i players on %i courts: valid rounds and fair byes", (players, courts) => {
    const t = play(tournament("mexicano", players, courts, { mode: "singles" }), 8);
    for (const r of t.rounds) expectValidRound(t, r);
    expect(byeSpread(t)).toBeLessThanOrEqual(1);
  });

  it("pairs 1st v 2nd, 3rd v 4th", () => {
    expect(pairByRank(["a", "b", "c", "d"], buildHistory([], "player"))).toEqual(["a", "b", "c", "d"]);
  });

  it("swaps with the next pair to avoid a rematch", () => {
    const singles = (a: string, b: string) => ({ court: 0, a: { p: [a] }, b: { p: [b] }, s: [12, 12] as [number, number] });
    const history = buildHistory([round([singles("a", "b")])], "player");
    expect(pairByRank(["a", "b", "c", "d"], history)).toEqual(["a", "c", "b", "d"]);
  });

  it("puts the top two on Court 1 after round one", () => {
    const players = makePlayers(4);
    const t = tournament("mexicano", 4, 2, {
      mode: "singles",
      players,
      rounds: [
        round([
          { court: 0, a: { p: ["p1"] }, b: { p: ["p2"] }, s: [20, 4] },
          { court: 1, a: { p: ["p3"] }, b: { p: ["p4"] }, s: [18, 6] },
        ]),
      ],
    });
    const result = generateRound(t);
    if (!result.ok) throw new Error(result.reason);
    // Ranking p1 (20), p3 (18), p4 (6), p2 (4) → p1 v p3, p4 v p2
    expect(result.round.matches[0]).toMatchObject({ court: 0, a: { p: ["p1"] }, b: { p: ["p3"] } });
  });
});
