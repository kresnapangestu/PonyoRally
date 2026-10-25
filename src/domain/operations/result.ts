import type { Match, Tournament } from "../types";

/**
 * Every operation is pure: it takes a tournament and returns a new one, or a
 * reason it refused. Stores persist the result; the UI explains the reason.
 */
export type OpResult<E extends string> =
  | { ok: true; tournament: Tournament }
  | { ok: false; error: E };

export interface MatchRef {
  round: number;
  match: number;
}

export const success = (tournament: Tournament) => ({ ok: true, tournament }) as const;
export const failure = <E extends string>(error: E) => ({ ok: false, error }) as const;

export function findMatch(t: Tournament, ref: MatchRef): Match | undefined {
  return t.rounds[ref.round]?.matches[ref.match];
}

/** Returns a copy of the tournament with one match replaced. */
export function replaceMatch(t: Tournament, ref: MatchRef, next: Match): Tournament {
  return {
    ...t,
    rounds: t.rounds.map((round, r) =>
      r !== ref.round ? round : { ...round, matches: round.matches.map((m, i) => (i === ref.match ? next : m)) },
    ),
  };
}
