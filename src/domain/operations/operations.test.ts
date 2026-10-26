import { describe, expect, it } from "vitest";
import {
  doublesMatch,
  makePlayers,
  makeTournament,
  round,
} from "../__fixtures__/tournament";
import { computeStandings } from "../standings";
import type { Tournament } from "../types";
import {
  addLatePlayer,
  clearScore,
  createTournament,
  finishTournament,
  generateNextRound,
  redoLastRound,
  renamePlayer,
  setAvailability,
  setPlayerStatus,
  setScore,
  skipMatch,
  substitute,
  swapPlayers,
} from "./index";

const ok = <T extends { ok: boolean }>(result: T) => {
  if (!result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
};

/** 9 players, round 1: p1+p2 v p3+p4 · p5+p6 v p7+p8 · p9 rests. */
function oneRound(overrides: Partial<Tournament> = {}): Tournament {
  return makeTournament({
    players: makePlayers(9),
    rounds: [
      round(
        [
          doublesMatch(["p1", "p2"], ["p3", "p4"]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], undefined, 1),
        ],
        ["p9"],
      ),
    ],
    ...overrides,
  });
}

const first = { round: 0, match: 0 };
const second = { round: 0, match: 1 };

describe("scores", () => {
  it("records a valid score and rejects an invalid one", () => {
    const t = ok(setScore(oneRound(), first, [14, 10])).tournament;
    expect(t.rounds[0].matches[0].s).toEqual([14, 10]);
    expect(setScore(oneRound(), first, [14, 9])).toEqual({
      ok: false,
      error: "wrongTotal",
    });
  });

  it("corrects and clears a score", () => {
    let t = ok(setScore(oneRound(), first, [14, 10])).tournament;
    t = ok(setScore(t, first, [10, 14])).tournament;
    expect(t.rounds[0].matches[0].s).toEqual([10, 14]);
    t = ok(clearScore(t, first)).tournament;
    expect(t.rounds[0].matches[0].s).toBeUndefined();
  });

  it("never skips a match that has a score", () => {
    const t = ok(setScore(oneRound(), first, [14, 10])).tournament;
    expect(skipMatch(t, first)).toEqual({ ok: false, error: "hasScore" });
    expect(
      ok(skipMatch(oneRound(), first)).tournament.rounds[0].matches[0].skipped,
    ).toBe(true);
  });

  it("does not mutate the original tournament", () => {
    const original = oneRound();
    setScore(original, first, [14, 10]);
    expect(original.rounds[0].matches[0].s).toBeUndefined();
  });

  it("refuses edits once finished", () => {
    const finished = ok(finishTournament(oneRound())).tournament;
    expect(setScore(finished, first, [14, 10])).toEqual({
      ok: false,
      error: "finished",
    });
  });
});

describe("substitute", () => {
  it("swaps in a resting player and records the change", () => {
    const t = ok(
      substitute(oneRound(), first, { out: "p1", in: "p9" }),
    ).tournament;
    const match = t.rounds[0].matches[0];
    expect(match.a.p).toEqual(["p9", "p2"]);
    expect(match.subs).toEqual([
      { side: 0, out: "p1", in: "p9", scoreKept: false },
    ]);
    expect(t.rounds[0].byes).toEqual([]);
  });

  it("blocks a player who is already playing elsewhere", () => {
    expect(substitute(oneRound(), first, { out: "p1", in: "p5" })).toEqual({
      ok: false,
      error: "busy",
    });
  });

  it("asks for a decision when a score exists, and credits the substitute when kept", () => {
    const scored = ok(setScore(oneRound(), first, [14, 10])).tournament;
    expect(substitute(scored, first, { out: "p1", in: "p9" })).toEqual({
      ok: false,
      error: "needsDecision",
    });

    const kept = ok(
      substitute(scored, first, { out: "p1", in: "p9", decision: "keep" }),
    ).tournament;
    const rows = Object.fromEntries(
      computeStandings(kept).map((r) => [r.id, r]),
    );
    expect(rows.p9.points).toBe(14);
    expect(rows.p1.points).toBe(0);
    expect(kept.rounds[0].matches[0].subs?.[0].scoreKept).toBe(true);

    const cleared = ok(
      substitute(scored, first, { out: "p1", in: "p9", decision: "clear" }),
    ).tournament;
    expect(cleared.rounds[0].matches[0].s).toBeUndefined();
  });

  it("rejects unknown, withdrawn and same-match players", () => {
    expect(substitute(oneRound(), first, { out: "p1", in: "nobody" })).toEqual({
      ok: false,
      error: "unknownPlayer",
    });
    const withdrawn = ok(
      setPlayerStatus(oneRound(), "p9", "withdrawn"),
    ).tournament;
    expect(substitute(withdrawn, first, { out: "p1", in: "p9" })).toEqual({
      ok: false,
      error: "unknownPlayer",
    });
    expect(substitute(oneRound(), first, { out: "p1", in: "p2" })).toEqual({
      ok: false,
      error: "alreadyInMatch",
    });
    expect(substitute(oneRound(), first, { out: "p5", in: "p9" })).toEqual({
      ok: false,
      error: "notInMatch",
    });
  });

  it("keeps mixed teams mixed", () => {
    const players = makePlayers(9, [
      "M",
      "M",
      "F",
      "F",
      "M",
      "M",
      "F",
      "F",
      "M",
    ]);
    const t = oneRound({ format: "mixAmericano", players });
    expect(substitute(t, first, { out: "p3", in: "p9" })).toEqual({
      ok: false,
      error: "genderMismatch",
    });
    expect(substitute(t, first, { out: "p1", in: "p9" }).ok).toBe(true);
  });
});

describe("swapPlayers", () => {
  it("exchanges two players between matches of a round", () => {
    const t = ok(swapPlayers(oneRound(), 0, "p1", "p5")).tournament;
    expect(t.rounds[0].matches[0].a.p).toEqual(["p5", "p2"]);
    expect(t.rounds[0].matches[1].a.p).toEqual(["p1", "p6"]);
  });

  it("needs a decision when either match has a score", () => {
    const scored = ok(setScore(oneRound(), second, [14, 10])).tournament;
    expect(swapPlayers(scored, 0, "p1", "p5")).toEqual({
      ok: false,
      error: "needsDecision",
    });
    const cleared = ok(swapPlayers(scored, 0, "p1", "p5", "clear")).tournament;
    expect(cleared.rounds[0].matches[1].s).toBeUndefined();
  });
});

describe("rounds", () => {
  it("generates the next round only when the current one is resolved", () => {
    const t = oneRound();
    expect(generateNextRound(t, 1)).toEqual({
      ok: false,
      error: "previousRoundIncomplete",
    });

    let done = ok(setScore(t, first, [14, 10])).tournament;
    done = ok(skipMatch(done, second)).tournament;
    const next = ok(generateNextRound(done, 1));
    expect(next.tournament.rounds).toHaveLength(2);
    expect(next.notes).toBeDefined();
  });

  it("ignores a duplicate tap", () => {
    let t = ok(setScore(oneRound(), first, [14, 10])).tournament;
    t = ok(setScore(t, second, [14, 10])).tournament;
    const twice = ok(generateNextRound(t, 1)).tournament;
    expect(generateNextRound(twice, 1)).toEqual({ ok: false, error: "stale" });
  });

  it("applies and then clears 'not playing next round'", () => {
    let t = ok(setScore(oneRound(), first, [14, 10])).tournament;
    t = ok(setScore(t, second, [14, 10])).tournament;
    t = ok(setAvailability(t, "p1", false)).tournament;
    const next = ok(generateNextRound(t, 1)).tournament;

    const playing = next.rounds[1].matches.flatMap((m) => [...m.a.p, ...m.b.p]);
    expect(playing).not.toContain("p1");
    expect(next.rounds[1].out).toEqual(["p1"]);
    expect(next.pendingOut).toBeUndefined();
  });

  it("redoes the last round only while untouched", () => {
    const t = createTournament({
      draft: {
        name: "Test",
        format: "americano",
        mode: "doubles",
        courtNames: ["A", "B"],
        scoring: "total",
        targetPoints: 24,
        players: makePlayers(8).map((p) => ({ id: p.id, name: p.name })),
        teams: [],
      },
      id: "t1",
      seed: 5,
      now: 0,
      createId: () => "x",
    });
    const created = ok(t).tournament;
    const redone = ok(redoLastRound(created)).tournament;
    expect(redone.rounds).toHaveLength(1);
    expect(redone.rounds[0].attempt).toBe(1);

    const scored = ok(setScore(created, first, [14, 10])).tournament;
    expect(redoLastRound(scored)).toEqual({ ok: false, error: "roundStarted" });
  });
});

describe("roster", () => {
  it("adds a late player who can play from the next round", () => {
    const t = ok(
      addLatePlayer(oneRound(), { id: "late", name: "  Resi " }),
    ).tournament;
    expect(t.players.at(-1)).toEqual({
      id: "late",
      name: "Resi",
      joinedRound: 1,
      status: "active",
    });
  });

  it("requires a gender for late players in mixed formats", () => {
    const t = oneRound({
      format: "mixicano",
      players: makePlayers(9, Array(9).fill("M")),
    });
    expect(addLatePlayer(t, { id: "x", name: "Nina" })).toEqual({
      ok: false,
      error: "genderRequired",
    });
  });

  it("renames a player everywhere at once", () => {
    const t = ok(renamePlayer(oneRound(), "p1", "John Doe")).tournament;
    expect(t.players[0].name).toBe("John Doe");
    expect(renamePlayer(t, "p1", " ")).toEqual({
      ok: false,
      error: "nameRequired",
    });
  });
});

describe("createTournament", () => {
  const draft = {
    name: " Minggu Pagi ",
    format: "teamAmericano" as const,
    mode: "doubles" as const,
    courtNames: ["Lapangan 1", "Lapangan 2"],
    scoring: "total" as const,
    targetPoints: 24,
    players: makePlayers(8).map((p) => ({
      id: p.id,
      name: ` ${p.name} `,
      gender: "M" as const,
    })),
    teams: [
      ["p1", "p2"],
      ["p3", "p4"],
      ["p5", "p6"],
      ["p7", "p8"],
    ] as [string, string][],
  };

  it("builds teams, cleans names, drops unused gender and draws round 1", () => {
    let n = 0;
    const result = ok(
      createTournament({
        draft,
        id: "t1",
        seed: 1,
        now: 100,
        createId: () => `team${++n}`,
      }),
    );
    const t = result.tournament;
    expect(t.name).toBe("Minggu Pagi");
    expect(t.players[0]).toEqual({
      id: "p1",
      name: "Player 1",
      joinedRound: 0,
      status: "active",
    });
    expect(t.teams).toHaveLength(4);
    expect(t.rounds).toHaveLength(1);
    expect(t.rounds[0].matches).toHaveLength(2);
  });

  it("refuses an invalid setup with its issues", () => {
    const result = createTournament({
      draft: { ...draft, name: "" },
      id: "t1",
      seed: 1,
      now: 0,
      createId: () => "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "invalidSetup") {
      expect(result.issues.map((i) => i.code)).toContain("nameRequired");
    }
  });
});
