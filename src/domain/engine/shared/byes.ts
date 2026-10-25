import type { ID } from "../../types";
import { restCount, type History } from "./history";
import { shuffle, type Rng } from "./rng";

/**
 * Picks who sits out: those who have rested least go first, so nobody rests
 * twice before everyone has rested once. Among equals, `preferred` entries go
 * first (lets a round-robin schedule keep its own rest order), then a seeded
 * random pick.
 */
export function selectByes(
  candidates: readonly ID[],
  count: number,
  history: History,
  rng: Rng,
  preferred: readonly ID[] = [],
): ID[] {
  if (count <= 0) return [];
  const preferredSet = new Set(preferred);

  return shuffle(candidates, rng)
    .sort(
      (a, b) =>
        restCount(history, a) - restCount(history, b) ||
        Number(preferredSet.has(b)) - Number(preferredSet.has(a)),
    )
    .slice(0, count);
}
