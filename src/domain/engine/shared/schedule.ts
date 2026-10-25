import { individualCapacity, mixedCapacity, teamCapacity } from "../../capacity";
import type { ID } from "../../types";
import type { RoundNote } from "../types";
import { selectByes } from "./byes";
import { circleRound, intactPairs, type CirclePair } from "./circle";
import { doublesCourtCost, headToHeadCourtCost } from "./cost";
import { pairKey, type History } from "./history";
import { optimize, type SearchProblem } from "./search";
import { shuffle, type Rng } from "./rng";

/**
 * Rotation schedulers shared by the Americano family. Each returns the
 * resting entries and a flat arrangement in court order:
 *  - head-to-head: [A, B] per court (singles players, or teams)
 *  - doubles:      [A1, A2, B1, B2] per court
 */

const RESTARTS = 48;

export interface ScheduleInput {
  entries: readonly ID[];
  courts: number;
  history: History;
  rng: Rng;
  /** Round-robin position; advances with each round and each redo. */
  rotation: number;
  stableOrder: (ids: readonly ID[]) => ID[];
}

export interface Schedule {
  byes: ID[];
  arrangement: ID[];
  courtsUsed: number;
}

const hasNoRepeats = (map: Map<string, number>, pairs: readonly CirclePair[]) =>
  pairs.every(([a, b]) => !map.has(pairKey(a, b)));

/** Spreads already-decided units (pairs or matches) over courts. */
function placeUnits<U extends readonly ID[]>(
  units: U[],
  perCourt: number,
  costOf: (flat: ID[], court: number) => number,
  rng: Rng,
): ID[] {
  const problem: SearchProblem<U> = {
    perCourt,
    courtCost: (courtUnits, court) => costOf(courtUnits.flat(), court),
    randomArrangement: (r) => shuffle(units, r),
  };
  return optimize(problem, rng, { restarts: 8, starts: [units] }).arrangement.flat();
}

export function scheduleHeadToHead(input: ScheduleInput): Schedule | null {
  const { entries, courts, history, rng, rotation } = input;
  const capacity = teamCapacity(entries.length, courts);
  if (capacity.courtsUsed === 0) return null;

  const circle = circleRound(input.stableOrder(entries), rotation);
  const byes = selectByes(entries, capacity.byes, history, rng, circle.resting ? [circle.resting] : []);
  const resting = new Set(byes);
  const playing = entries.filter((id) => !resting.has(id));
  const cost = (flat: readonly ID[], court: number) => headToHeadCourtCost(history, flat, court);

  // A clean round-robin round wins outright: it keeps the whole schedule rematch-free.
  const circlePairs = intactPairs(circle.pairs, new Set(playing));
  if (circlePairs && hasNoRepeats(history.opponents, circlePairs)) {
    return { byes, arrangement: placeUnits(circlePairs, 1, cost, rng), courtsUsed: capacity.courtsUsed };
  }

  const best = optimize<ID>(
    { perCourt: 2, courtCost: cost, randomArrangement: (r) => shuffle(playing, r) },
    rng,
    { restarts: RESTARTS, starts: circlePairs ? [circlePairs.flat()] : [] },
  );
  return { byes, arrangement: best.arrangement, courtsUsed: capacity.courtsUsed };
}

export function scheduleDoubles(input: ScheduleInput): Schedule | null {
  const { entries, courts, history, rng, rotation } = input;
  const capacity = individualCapacity(entries.length, courts, "doubles");
  if (capacity.courtsUsed === 0) return null;

  // The circle decides partners; everyone partners everyone once per cycle.
  const circle = circleRound(input.stableOrder(entries), rotation);
  const byes = selectByes(entries, capacity.byes, history, rng, circle.resting ? [circle.resting] : []);
  const resting = new Set(byes);
  const playing = entries.filter((id) => !resting.has(id));
  const cost = (flat: readonly ID[], court: number) => doublesCourtCost(history, flat, court);

  const circlePairs = intactPairs(circle.pairs, new Set(playing));
  const circleArrangement = circlePairs ? placeUnits(circlePairs, 2, cost, rng) : null;
  if (circlePairs && circleArrangement && hasNoRepeats(history.partners, circlePairs)) {
    return { byes, arrangement: circleArrangement, courtsUsed: capacity.courtsUsed };
  }

  const best = optimize<ID>(
    { perCourt: 4, courtCost: cost, randomArrangement: (r) => shuffle(playing, r) },
    rng,
    { restarts: RESTARTS, starts: circleArrangement ? [circleArrangement] : [] },
  );
  return { byes, arrangement: best.arrangement, courtsUsed: capacity.courtsUsed };
}

export interface MixedInput extends Omit<ScheduleInput, "entries"> {
  men: readonly ID[];
  women: readonly ID[];
}

/** Doubles where every team is one man + one woman: courts are [M, W, M, W]. */
export function scheduleMixedDoubles(input: MixedInput): Schedule | null {
  const { men, women, courts, history, rng, rotation } = input;
  const capacity = mixedCapacity(men.length, women.length, courts);
  if (capacity.courtsUsed === 0) return null;

  const byes = [
    ...selectByes(men, capacity.byesMen ?? 0, history, rng),
    ...selectByes(women, capacity.byesWomen ?? 0, history, rng),
  ];
  const resting = new Set(byes);
  const playingMen = men.filter((id) => !resting.has(id));
  const playingWomen = women.filter((id) => !resting.has(id));
  const cost = (flat: readonly ID[], court: number) => doublesCourtCost(history, flat, court);

  // With everyone playing, rotate women against a fixed order of men:
  // every man partners every woman once per cycle.
  let rotationArrangement: ID[] | null = null;
  if (byes.length === 0) {
    const orderedMen = input.stableOrder(playingMen);
    const orderedWomen = input.stableOrder(playingWomen);
    const n = orderedMen.length;
    const pairs: CirclePair[] = orderedMen.map((m, i) => [m, orderedWomen[(i + rotation) % n]]);
    rotationArrangement = placeUnits(pairs, 2, cost, rng);
    if (hasNoRepeats(history.partners, pairs)) {
      return { byes, arrangement: rotationArrangement, courtsUsed: capacity.courtsUsed };
    }
  }

  const interleave = (m: ID[], w: ID[]) => m.flatMap((man, i) => [man, w[i]]);
  const best = optimize<ID>(
    {
      perCourt: 4,
      courtCost: cost,
      randomArrangement: (r) => interleave(shuffle(playingMen, r), shuffle(playingWomen, r)),
      canSwap: (i, j) => i % 2 === j % 2,
    },
    rng,
    {
      restarts: RESTARTS,
      starts: rotationArrangement ? [rotationArrangement] : [],
    },
  );
  return { byes, arrangement: best.arrangement, courtsUsed: capacity.courtsUsed };
}

/** Notes for the UI: which kinds of repeat this round contains. */
export function repeatNotes(
  history: History,
  arrangement: readonly ID[],
  perCourt: 2 | 4,
  courtsUsed: number,
  courts: number,
): RoundNote[] {
  const notes = new Set<RoundNote>();
  for (let start = 0; start < arrangement.length; start += perCourt) {
    const court = arrangement.slice(start, start + perCourt);
    const half = perCourt / 2;
    const sideA = court.slice(0, half);
    const sideB = court.slice(half);
    if (perCourt === 4) {
      if (history.partners.has(pairKey(sideA[0], sideA[1])) || history.partners.has(pairKey(sideB[0], sideB[1]))) {
        notes.add("partnerRepeat");
      }
    }
    if (sideA.some((a) => sideB.some((b) => history.opponents.has(pairKey(a, b))))) {
      notes.add("opponentRepeat");
    }
  }
  if (courtsUsed < courts) notes.add("emptyCourts");
  return [...notes];
}
