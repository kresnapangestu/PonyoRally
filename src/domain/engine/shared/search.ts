import type { Rng } from "./rng";

/**
 * Bounded local search over an arrangement: a flat array where each court
 * owns `perCourt` consecutive slots. Starts from several arrangements, then
 * keeps swapping two slots while that lowers the total cost. Only the one or
 * two courts touched by a swap are re-scored, so each step is cheap.
 */

export interface SearchProblem<U> {
  perCourt: number;
  courtCost: (courtUnits: readonly U[], court: number) => number;
  randomArrangement: (rng: Rng) => U[];
  /** Restricts swaps, e.g. men only swap with men in mixed doubles. */
  canSwap?: (i: number, j: number) => boolean;
}

export interface SearchResult<U> {
  arrangement: U[];
  cost: number;
}

const MAX_PASSES = 40;
const EPSILON = 1e-9;

function scoreCourt<U>(problem: SearchProblem<U>, arrangement: U[], court: number) {
  const start = court * problem.perCourt;
  return problem.courtCost(arrangement.slice(start, start + problem.perCourt), court);
}

export function arrangementCost<U>(problem: SearchProblem<U>, arrangement: U[]) {
  let total = 0;
  for (let court = 0; court * problem.perCourt < arrangement.length; court++) {
    total += scoreCourt(problem, arrangement, court);
  }
  return total;
}

function improve<U>(problem: SearchProblem<U>, start: U[]): SearchResult<U> {
  const arrangement = [...start];
  const { perCourt } = problem;
  const courtCosts = Array.from({ length: arrangement.length / perCourt }, (_, c) =>
    scoreCourt(problem, arrangement, c),
  );

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false;
    for (let i = 0; i < arrangement.length; i++) {
      for (let j = i + 1; j < arrangement.length; j++) {
        if (problem.canSwap && !problem.canSwap(i, j)) continue;
        const ci = Math.floor(i / perCourt);
        const cj = Math.floor(j / perCourt);

        [arrangement[i], arrangement[j]] = [arrangement[j], arrangement[i]];
        const newCi = scoreCourt(problem, arrangement, ci);
        const newCj = ci === cj ? 0 : scoreCourt(problem, arrangement, cj);
        const before = ci === cj ? courtCosts[ci] : courtCosts[ci] + courtCosts[cj];
        const after = newCi + newCj;

        if (after < before - EPSILON) {
          courtCosts[ci] = newCi;
          if (ci !== cj) courtCosts[cj] = newCj;
          improved = true;
        } else {
          [arrangement[i], arrangement[j]] = [arrangement[j], arrangement[i]];
        }
      }
    }
    if (!improved) break;
  }
  return { arrangement, cost: courtCosts.reduce((sum, c) => sum + c, 0) };
}

export function optimize<U>(
  problem: SearchProblem<U>,
  rng: Rng,
  { restarts, starts = [] }: { restarts: number; starts?: U[][] },
): SearchResult<U> {
  let best: SearchResult<U> | null = null;
  const candidates = [...starts];
  for (let k = 0; k < restarts; k++) candidates.push(problem.randomArrangement(rng));

  for (const start of candidates) {
    const result = improve(problem, start);
    if (!best || result.cost < best.cost - EPSILON) best = result;
    if (best.cost <= EPSILON) break; // nothing repeats; cannot do better
  }
  if (!best) throw new Error("optimize() needs at least one start");
  return best;
}
