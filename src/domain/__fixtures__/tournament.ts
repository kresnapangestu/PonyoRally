import type { Gender, Match, Player, Round, Tournament } from "../types";

/** Test-only builders. Player IDs are p1..pN so assertions stay readable. */

export function makePlayers(count: number, genders?: Gender[]): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gender: genders?.[i],
    joinedRound: 0,
    status: "active",
  }));
}

export function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "t1",
    name: "Test",
    format: "americano",
    mode: "doubles",
    courts: ["Court 1", "Court 2"],
    scoring: "total",
    targetPoints: 24,
    seed: 1,
    players: makePlayers(8),
    rounds: [],
    status: "active",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

export function doublesMatch(
  a: [string, string],
  b: [string, string],
  s?: [number, number],
  court = 0,
): Match {
  return { court, a: { p: a }, b: { p: b }, ...(s ? { s } : {}) };
}

export function round(matches: Match[], byes: string[] = []): Round {
  return { matches, byes, out: [], attempt: 0 };
}
