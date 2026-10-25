import { expect } from "vitest";
import { buildHistory } from "../shared/history";
import type { Gender, ID, Round, Team, Tournament } from "../../types";
import { makePlayers, makeTournament } from "../../__fixtures__/tournament";
import { generateRound } from "../index";

/** Test-only helpers: play a tournament forward and check every round. */

export function courtsNamed(count: number) {
  return Array.from({ length: count }, (_, i) => `Court ${i + 1}`);
}

export function teamsOf(playerCount: number): Team[] {
  return Array.from({ length: playerCount / 2 }, (_, i) => ({
    id: `t${i + 1}`,
    players: [`p${2 * i + 1}`, `p${2 * i + 2}`],
  }));
}

export function genders(men: number, women: number): Gender[] {
  return [...Array<Gender>(men).fill("M"), ...Array<Gender>(women).fill("F")];
}

export function tournament(
  format: Tournament["format"],
  players: number,
  courts: number,
  extra: Partial<Tournament> = {},
): Tournament {
  return makeTournament({ format, players: makePlayers(players), courts: courtsNamed(courts), ...extra });
}

/** Scores every match with a deterministic, varied result. */
function scoreRound(round: Round, total: number, roundIndex: number): Round {
  return {
    ...round,
    matches: round.matches.map((m, i) => {
      const a = (roundIndex * 7 + i * 5) % (total + 1);
      return { ...m, s: [a, total - a] };
    }),
  };
}

export function play(t: Tournament, rounds: number): Tournament {
  let current = t;
  for (let r = 0; r < rounds; r++) {
    const result = generateRound(current);
    if (!result.ok) throw new Error(`Round ${r + 1} failed: ${result.reason}`);
    const scored = scoreRound(result.round, current.targetPoints, r);
    current = { ...current, rounds: [...current.rounds, scored] };
  }
  return current;
}

const entriesOfSide = (t: Tournament, side: { p: ID[]; t?: ID }) => (t.teams ? [side.t!] : side.p);

/** Structural rules every generated round must satisfy. */
export function expectValidRound(t: Tournament, round: Round) {
  const seen = new Set<ID>();
  const sideSize = t.teams ? 2 : t.mode === "doubles" ? 2 : 1;
  const genderOf = new Map(t.players.map((p) => [p.id, p.gender]));

  for (const match of round.matches) {
    expect(match.court).toBeLessThan(t.courts.length);
    for (const side of [match.a, match.b]) {
      expect(side.p).toHaveLength(sideSize);
      if (t.format === "mixAmericano" || t.format === "mixicano") {
        expect(new Set(side.p.map((id) => genderOf.get(id)))).toEqual(new Set(["M", "F"]));
      }
      for (const id of side.p) {
        expect(seen.has(id), `${id} appears twice in a round`).toBe(false);
        seen.add(id);
      }
    }
  }
  const courtsUsed = new Set(round.matches.map((m) => m.court));
  expect(courtsUsed.size).toBe(round.matches.length);

  // Nobody both plays and rests.
  const playingEntries = new Set(round.matches.flatMap((m) => [m.a, m.b].flatMap((s) => entriesOfSide(t, s))));
  for (const id of round.byes) expect(playingEntries.has(id), `${id} rests and plays`).toBe(false);
}

export function partnerRepeats(t: Tournament) {
  const history = buildHistory(t.rounds, "player");
  return [...history.partners.values()].filter((n) => n > 1).length;
}

export function opponentRepeats(t: Tournament) {
  const history = buildHistory(t.rounds, t.teams ? "team" : "player");
  return [...history.opponents.values()].filter((n) => n > 1).length;
}

/** Bye spread (max − min rests) across the given entries; default: everyone. */
export function byeSpread(t: Tournament, ids?: ID[]) {
  const entries = ids ?? (t.teams ? t.teams.map((team) => team.id) : t.players.map((p) => p.id));
  const counts = new Map<ID, number>(entries.map((id) => [id, 0]));
  for (const round of t.rounds) {
    for (const id of round.byes) if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
  }
  const values = [...counts.values()];
  return Math.max(...values) - Math.min(...values);
}

export function byeCount(t: Tournament, id: ID) {
  return t.rounds.filter((r) => r.byes.includes(id)).length;
}
