import { describe, expect, it } from "vitest";
import { individualCapacity } from "../../capacity";
import { makePlayers } from "../../__fixtures__/tournament";
import {
  byeCount,
  byeSpread,
  expectValidRound,
  opponentRepeats,
  partnerRepeats,
  play,
  tournament,
} from "../__fixtures__/simulate";
import { generateRound } from "../index";

describe("Americano doubles — invariants", () => {
  const cases = [];
  for (let players = 4; players <= 20; players++) {
    for (let courts = 1; courts <= 4; courts++) cases.push([players, courts]);
  }

  it.each(cases)("%i players on %i courts: valid rounds, fair byes", (players, courts) => {
    const t = play(tournament("americano", players, courts), 8);
    const capacity = individualCapacity(players, courts, "doubles");

    t.rounds.forEach((round, r) => {
      expectValidRound(t, round);
      expect(round.matches).toHaveLength(capacity.courtsUsed);
      expect(round.byes).toHaveLength(capacity.byes);
      expect(byeSpread({ ...t, rounds: t.rounds.slice(0, r + 1) })).toBeLessThanOrEqual(1);
    });
  });
});

describe("Americano doubles — partner rotation", () => {
  it.each([
    [8, 2],
    [12, 3],
    [16, 4],
  ])("%i players on %i courts: nobody partners twice in a full cycle", (players, courts) => {
    const t = play(tournament("americano", players, courts), players - 1);
    expect(partnerRepeats(t)).toBe(0);
  });

  it("9 players on 2 courts: 9 rounds, everyone rests once, no partner repeats", () => {
    const t = play(tournament("americano", 9, 2), 9);
    expect(partnerRepeats(t)).toBe(0);
    for (const p of t.players) expect(byeCount(t, p.id)).toBe(1);
  });

  it("keeps repeats low when byes break the round-robin (10 players, 2 courts)", () => {
    // 45 possible partnerships; 8 rounds use 32 partner slots.
    const t = play(tournament("americano", 10, 2), 8);
    expect(partnerRepeats(t)).toBe(0);
  });

  it("reports a partner repeat once the cycle is exhausted", () => {
    const t = play(tournament("americano", 4, 1), 3);
    const result = generateRound(t);
    expect(result.ok && result.notes).toContain("partnerRepeat");
  });
});

describe("Americano singles", () => {
  it.each([
    [2, 1],
    [7, 3],
    [8, 4],
    [10, 2],
    [15, 4],
  ])("%i players on %i courts: valid rounds and fair byes", (players, courts) => {
    const t = play(tournament("americano", players, courts, { mode: "singles" }), 8);
    const capacity = individualCapacity(players, courts, "singles");
    for (const round of t.rounds) {
      expectValidRound(t, round);
      expect(round.byes).toHaveLength(capacity.byes);
    }
    expect(byeSpread(t)).toBeLessThanOrEqual(1);
  });

  it("8 players on 4 courts: everyone meets everyone once in 7 rounds", () => {
    expect(opponentRepeats(play(tournament("americano", 8, 4, { mode: "singles" }), 7))).toBe(0);
  });

  it("7 players on 3 courts: 7 rounds, one rest each, no rematches", () => {
    const t = play(tournament("americano", 7, 3, { mode: "singles" }), 7);
    expect(opponentRepeats(t)).toBe(0);
    for (const p of t.players) expect(byeCount(t, p.id)).toBe(1);
  });
});

describe("generateRound — shared behavior", () => {
  it("is deterministic for the same tournament", () => {
    const t = tournament("americano", 10, 2);
    expect(generateRound(t)).toEqual(generateRound(t));
  });

  it("gives new partners on redo", () => {
    const partnersOf = (result: ReturnType<typeof generateRound>) =>
      result.ok ? result.round.matches.flatMap((m) => [m.a.p.toSorted().join("+"), m.b.p.toSorted().join("+")]) : [];

    const t = play(tournament("americano", 12, 3), 2);
    const first = generateRound(t, { attempt: 0 });
    const redo = generateRound(t, { attempt: 1 });
    const shared = partnersOf(redo).filter((pair) => partnersOf(first).includes(pair));

    expect(shared).toEqual([]);
    expect(redo.ok && redo.round.attempt).toBe(1);
  });

  it("refuses to advance while the previous round has pending matches", () => {
    const t = tournament("americano", 8, 2);
    const first = generateRound(t);
    if (!first.ok) throw new Error("setup");
    const next = generateRound({ ...t, rounds: [first.round] });
    expect(next).toEqual({ ok: false, reason: "previousRoundIncomplete" });
  });

  it("refuses when too few players are available", () => {
    const t = tournament("americano", 4, 1);
    expect(generateRound(t, { out: ["p1"] })).toEqual({ ok: false, reason: "notEnoughPlayers" });
  });

  it("leaves out unavailable and withdrawn players and records who was out", () => {
    const players = makePlayers(9);
    players[8] = { ...players[8], status: "withdrawn" };
    const t = tournament("americano", 9, 2, { players });
    const result = generateRound(t, { out: ["p1"] });
    if (!result.ok) throw new Error(result.reason);

    const playing = result.round.matches.flatMap((m) => [...m.a.p, ...m.b.p]);
    expect(playing).not.toContain("p1");
    expect(playing).not.toContain("p9");
    expect(result.round.out).toEqual(["p1"]);
  });

  it("lets a late joiner play right away instead of resting", () => {
    const players = [...makePlayers(8), { ...makePlayers(9)[8], joinedRound: 3 }];
    const t = play(tournament("americano", 9, 2, { players }), 3);
    const result = generateRound(t);
    if (!result.ok) throw new Error(result.reason);
    expect(result.round.byes).not.toContain("p9");
  });

  it("generates a 40-player, 10-court round quickly", () => {
    const t = play(tournament("americano", 40, 10), 6);
    const started = performance.now();
    const result = generateRound(t);
    const elapsed = performance.now() - started;
    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(250);
  });
});
