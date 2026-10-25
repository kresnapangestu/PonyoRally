import { describe, expect, it } from "vitest";
import { mixedCapacity } from "../../capacity";
import { makePlayers } from "../../__fixtures__/tournament";
import {
  byeSpread,
  courtsNamed,
  expectValidRound,
  genders,
  partnerRepeats,
  play,
} from "../__fixtures__/simulate";
import { makeTournament } from "../../__fixtures__/tournament";
import { generateRound } from "../index";

const mixed = (men: number, women: number, courts: number) =>
  makeTournament({
    format: "mixAmericano",
    players: makePlayers(men + women, genders(men, women)),
    courts: courtsNamed(courts),
  });

const idsOf = (t: ReturnType<typeof mixed>, gender: "M" | "F") =>
  t.players.filter((p) => p.gender === gender).map((p) => p.id);

describe("Mix Americano", () => {
  const cases = [];
  for (let men = 2; men <= 10; men += 2) {
    for (let women = 2; women <= 10; women += 3) {
      for (let courts = 1; courts <= 3; courts++) cases.push([men, women, courts]);
    }
  }

  it.each(cases)("%i men, %i women, %i courts: mixed teams, fair byes per gender", (men, women, courts) => {
    const t = play(mixed(men, women, courts), 8);
    const capacity = mixedCapacity(men, women, courts);
    for (const round of t.rounds) {
      expectValidRound(t, round); // includes the one-man-one-woman check
      expect(round.matches).toHaveLength(capacity.courtsUsed);
    }
    expect(byeSpread(t, idsOf(t, "M"))).toBeLessThanOrEqual(1);
    expect(byeSpread(t, idsOf(t, "F"))).toBeLessThanOrEqual(1);
  });

  it("4 men + 4 women on 2 courts: every man partners every woman once in 4 rounds", () => {
    expect(partnerRepeats(play(mixed(4, 4, 2), 4))).toBe(0);
  });

  it("8 men + 4 women on 3 courts: uses 2 courts and rests 4 men each round", () => {
    const t = play(mixed(8, 4, 3), 4);
    for (const round of t.rounds) {
      expect(round.matches).toHaveLength(2);
      expect(round.byes).toHaveLength(4);
      expect(round.byes.every((id) => idsOf(t, "M").includes(id))).toBe(true);
    }
  });

  it("refuses when a gender has fewer than two available players", () => {
    expect(generateRound(mixed(3, 2, 1), { out: ["p4"] })).toEqual({ ok: false, reason: "notEnoughWomen" });
    expect(generateRound(mixed(1, 4, 1))).toEqual({ ok: false, reason: "notEnoughMen" });
  });
});
