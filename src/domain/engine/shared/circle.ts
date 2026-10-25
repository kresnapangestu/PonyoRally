import type { ID } from "../../types";

/**
 * Circle method round-robin: with n entries (plus a dummy when n is odd),
 * every entry meets every other exactly once over n-1 rounds (n rounds when
 * odd, resting once each). Used for partners in doubles Americano and for
 * opponents in singles and Team Americano.
 */

export type CirclePair = [ID, ID];

export interface CircleRound {
  pairs: CirclePair[];
  /** The entry paired with the dummy (odd counts only): its turn to rest. */
  resting: ID | null;
}

export function circleRound(order: readonly ID[], roundIndex: number): CircleRound {
  const entries: (ID | null)[] = order.length % 2 === 0 ? [...order] : [...order, null];
  const n = entries.length;
  if (n < 2) return { pairs: [], resting: entries[0] ?? null };

  // Keep the first entry fixed; rotate the others by the round index.
  const rest = entries.slice(1);
  const shift = roundIndex % (n - 1);
  const rotated = [entries[0], ...rest.slice(rest.length - shift), ...rest.slice(0, rest.length - shift)];

  const pairs: CirclePair[] = [];
  let resting: ID | null = null;
  for (let i = 0; i < n / 2; i++) {
    const a = rotated[i];
    const b = rotated[n - 1 - i];
    if (a === null) resting = b;
    else if (b === null) resting = a;
    else pairs.push([a, b]);
  }
  return { pairs, resting };
}

/**
 * The circle pairs to use this round, or null if the round's players do not
 * line up with them (someone's partner is resting). In that case the caller
 * falls back to the general search.
 */
export function intactPairs(pairs: readonly CirclePair[], playing: ReadonlySet<ID>): CirclePair[] | null {
  const kept = pairs.filter(([a, b]) => playing.has(a) && playing.has(b));
  return kept.length * 2 === playing.size ? kept : null;
}
