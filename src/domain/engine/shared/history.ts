import type { ID, Round, Side } from "../../types";

/**
 * Counts gathered from previous rounds. "Entries" are players, or teams in
 * fixed-team formats. Built from the sides as played, so substitutions count
 * for whoever actually stood on court.
 */
export interface History {
  rounds: number;
  partners: Map<string, number>;
  opponents: Map<string, number>;
  /** key: `${entry}@${courtIndex}` */
  courtVisits: Map<string, number>;
  /** Times each entry was put in a match (skipped matches included). */
  scheduled: Map<ID, number>;
}

export type EntryUnit = "player" | "team";

export function pairKey(a: ID, b: ID) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function courtKey(entry: ID, court: number) {
  return `${entry}@${court}`;
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function entriesOf(side: Side, unit: EntryUnit): ID[] {
  if (unit === "team") return side.t ? [side.t] : [];
  return side.p;
}

export function buildHistory(rounds: readonly Round[], unit: EntryUnit): History {
  const history: History = {
    rounds: rounds.length,
    partners: new Map(),
    opponents: new Map(),
    courtVisits: new Map(),
    scheduled: new Map(),
  };

  for (const round of rounds) {
    for (const match of round.matches) {
      const a = entriesOf(match.a, unit);
      const b = entriesOf(match.b, unit);

      for (const side of [a, b]) {
        for (const entry of side) {
          bump(history.scheduled, entry);
          bump(history.courtVisits, courtKey(entry, match.court));
        }
        for (let i = 0; i < side.length; i++) {
          for (let j = i + 1; j < side.length; j++) bump(history.partners, pairKey(side[i], side[j]));
        }
      }
      for (const x of a) for (const y of b) bump(history.opponents, pairKey(x, y));
    }
  }
  return history;
}

/**
 * Rounds this entry did not play: byes, rounds marked unavailable, rounds
 * before joining, or being substituted out. Fewest rests sit out next.
 */
export function restCount(history: History, entry: ID) {
  return history.rounds - (history.scheduled.get(entry) ?? 0);
}
