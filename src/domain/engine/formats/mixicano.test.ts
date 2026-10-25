import { describe, expect, it } from "vitest";
import { mixedCapacity } from "../../capacity";
import { doublesMatch, makePlayers, makeTournament, round } from "../../__fixtures__/tournament";
import { byeSpread, courtsNamed, expectValidRound, genders, play } from "../__fixtures__/simulate";
import { buildHistory } from "../shared/history";
import { generateRound } from "../index";
import { fillMixedCourts, pairMixedCourt } from "./mixicano";

const mixed = (men: number, women: number, courts: number) =>
  makeTournament({
    format: "mixicano",
    players: makePlayers(men + women, genders(men, women)),
    courts: courtsNamed(courts),
  });

const idsOf = (t: ReturnType<typeof mixed>, gender: "M" | "F") =>
  t.players.filter((p) => p.gender === gender).map((p) => p.id);

describe("Mixicano — invariants", () => {
  const cases = [];
  for (let men = 2; men <= 10; men += 2) {
    for (let women = 2; women <= 10; women += 3) {
      for (let courts = 1; courts <= 3; courts++) cases.push([men, women, courts]);
    }
  }

  it.each(cases)("%i men, %i women, %i courts: mixed teams, fair byes per gender", (men, women, courts) => {
    const t = play(mixed(men, women, courts), 8);
    const capacity = mixedCapacity(men, women, courts);
    for (const r of t.rounds) {
      expectValidRound(t, r);
      expect(r.matches).toHaveLength(capacity.courtsUsed);
    }
    expect(byeSpread(t, idsOf(t, "M"))).toBeLessThanOrEqual(1);
    expect(byeSpread(t, idsOf(t, "F"))).toBeLessThanOrEqual(1);
  });

  it("refuses when a gender has fewer than two available players", () => {
    expect(generateRound(mixed(4, 2, 1), { out: ["p5"] })).toEqual({ ok: false, reason: "notEnoughWomen" });
  });
});

describe("fillMixedCourts", () => {
  it("fills courts top-down with two of each gender", () => {
    const ranked = [
      { id: "m1", gender: "M" as const },
      { id: "m2", gender: "M" as const },
      { id: "m3", gender: "M" as const },
      { id: "w1", gender: "F" as const },
      { id: "m4", gender: "M" as const },
      { id: "w2", gender: "F" as const },
      { id: "w3", gender: "F" as const },
      { id: "w4", gender: "F" as const },
    ];
    expect(fillMixedCourts(ranked, 2)).toEqual([
      { M: ["m1", "m2"], F: ["w1", "w2"] },
      { M: ["m3", "m4"], F: ["w3", "w4"] },
    ]);
  });
});

describe("pairMixedCourt", () => {
  it("pairs best man with weaker woman for balance", () => {
    expect(pairMixedCourt(["a", "b"], ["x", "y"], buildHistory([], "player"))).toEqual(["a", "y", "b", "x"]);
  });

  it("switches to avoid a repeated partnership", () => {
    const history = buildHistory([round([doublesMatch(["a", "y"], ["q", "r"], [12, 12])])], "player");
    expect(pairMixedCourt(["a", "b"], ["x", "y"], history)).toEqual(["a", "x", "b", "y"]);
  });
});

describe("Mixicano — ranking", () => {
  it("puts the best two men and best two women on Court 1", () => {
    // p1-p4 men, p5-p8 women. Round 1: p1+p5 vs p2+p6 (20-4), p3+p7 vs p4+p8 (14-10)
    const t = {
      ...mixed(4, 4, 2),
      rounds: [
        round([
          doublesMatch(["p1", "p5"], ["p2", "p6"], [20, 4]),
          doublesMatch(["p3", "p7"], ["p4", "p8"], [14, 10], 1),
        ]),
      ],
    };
    const result = generateRound(t);
    if (!result.ok) throw new Error(result.reason);
    // Ranking: p1,p5 (20), p3,p7 (14), p4,p8 (10), p2,p6 (4)
    // Court 1 gets men p1,p3 and women p5,p7 → p1 + p7 vs p3 + p5
    expect(result.round.matches[0]).toMatchObject({ court: 0, a: { p: ["p1", "p7"] }, b: { p: ["p3", "p5"] } });
  });
});
