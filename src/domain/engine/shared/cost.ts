import type { ID } from "../../types";
import { courtKey, pairKey, type History } from "./history";

/**
 * Round quality, following the agreed priorities: repeated partners hurt far
 * more than repeated opponents, which hurt more than playing the same court
 * again. Repeats are squared so a third repeat costs more than two firsts.
 */
export const WEIGHTS = {
  partner: 1000,
  opponent: 10,
  court: 1,
} as const;

const squared = (map: Map<string, number>, a: ID, b: ID) => (map.get(pairKey(a, b)) ?? 0) ** 2;

export function partnerCost(h: History, a: ID, b: ID) {
  return WEIGHTS.partner * squared(h.partners, a, b);
}

export function opponentCost(h: History, a: ID, b: ID) {
  return WEIGHTS.opponent * squared(h.opponents, a, b);
}

export function courtCost(h: History, entry: ID, court: number) {
  return WEIGHTS.court * (h.courtVisits.get(courtKey(entry, court)) ?? 0);
}

/** One doubles court laid out as [A1, A2, B1, B2]. */
export function doublesCourtCost(h: History, [a1, a2, b1, b2]: readonly ID[], court: number) {
  return (
    partnerCost(h, a1, a2) +
    partnerCost(h, b1, b2) +
    opponentCost(h, a1, b1) +
    opponentCost(h, a1, b2) +
    opponentCost(h, a2, b1) +
    opponentCost(h, a2, b2) +
    courtCost(h, a1, court) +
    courtCost(h, a2, court) +
    courtCost(h, b1, court) +
    courtCost(h, b2, court)
  );
}

/** One head-to-head court (singles, or team vs team) laid out as [A, B]. */
export function headToHeadCourtCost(h: History, [a, b]: readonly ID[], court: number) {
  return opponentCost(h, a, b) + courtCost(h, a, court) + courtCost(h, b, court);
}
