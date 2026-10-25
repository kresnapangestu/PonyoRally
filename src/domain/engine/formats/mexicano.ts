import { individualCapacity } from "../../capacity";
import type { ID } from "../../types";
import type { EngineContext, EngineResult, FormatEngine } from "../types";
import { doublesMatches, singlesMatches } from "../shared/build";
import { selectByes } from "../shared/byes";
import type { History } from "../shared/history";
import { rankedIds, timesMet, timesPartnered } from "../shared/ranking";
import { shuffle } from "../shared/rng";
import { repeatNotes } from "../shared/schedule";

/**
 * Mexicano: round 1 is a random draw; every later round is built from the
 * current ranking so similar players meet.
 *  - Doubles: groups of four in rank order, top group on Court 1, and within
 *    a group 1st & 4th vs 2nd & 3rd (balanced teams).
 *  - Singles: 1st vs 2nd, 3rd vs 4th, and so on.
 */

/** Splits of a ranked group [a, b, c, d], most balanced first. */
const GROUP_SPLITS = [
  [0, 3, 1, 2], // a & d vs b & c
  [0, 2, 1, 3], // a & c vs b & d
  [0, 1, 2, 3], // a & b vs c & d
] as const;

/**
 * Lays out one ranked group of four as [A1, A2, B1, B2]. Uses the most
 * balanced split unless another split repeats fewer past partnerships.
 */
export function splitGroup(group: readonly ID[], history: History): ID[] {
  let best: ID[] = [];
  let bestRepeats = Infinity;
  for (const split of GROUP_SPLITS) {
    const layout = split.map((i) => group[i]);
    const repeats = timesPartnered(history, layout[0], layout[1]) + timesPartnered(history, layout[2], layout[3]);
    if (repeats < bestRepeats) {
      best = layout;
      bestRepeats = repeats;
    }
  }
  return best;
}

/**
 * Pairs a ranked list 1v2, 3v4, … When a pair has met before, tries swapping
 * its lower player with the next pair's higher player, and keeps the swap
 * only if it means fewer rematches. One step, no wider search: rank order
 * matters more than variety in Mexicano.
 */
export function pairByRank(ranked: readonly ID[], history: History): ID[] {
  const order = [...ranked];
  for (let i = 0; i + 3 < order.length; i += 2) {
    const current = timesMet(history, order[i], order[i + 1]) + timesMet(history, order[i + 2], order[i + 3]);
    if (current === 0) continue;
    const swapped = timesMet(history, order[i], order[i + 2]) + timesMet(history, order[i + 1], order[i + 3]);
    if (swapped < current) [order[i + 1], order[i + 2]] = [order[i + 2], order[i + 1]];
  }
  return order;
}

function arrange(ctx: EngineContext, playing: ID[], singles: boolean): ID[] {
  if (ctx.roundIndex === 0) return shuffle(playing, ctx.rng);

  const ranked = rankedIds(ctx, playing);
  if (singles) return pairByRank(ranked, ctx.history);

  const arrangement: ID[] = [];
  for (let i = 0; i < ranked.length; i += 4) {
    arrangement.push(...splitGroup(ranked.slice(i, i + 4), ctx.history));
  }
  return arrangement;
}

export const mexicano: FormatEngine = {
  id: "mexicano",
  generate(ctx): EngineResult {
    const singles = ctx.t.mode === "singles";
    const courts = ctx.t.courts.length;
    const entries = ctx.players.map((p) => p.id);
    const capacity = individualCapacity(entries.length, courts, ctx.t.mode);
    if (capacity.courtsUsed === 0) return { ok: false, reason: "notEnoughPlayers" };

    const byes = selectByes(entries, capacity.byes, ctx.history, ctx.rng);
    const resting = new Set(byes);
    const arrangement = arrange(ctx, entries.filter((id) => !resting.has(id)), singles);

    return {
      ok: true,
      round: { matches: singles ? singlesMatches(arrangement) : doublesMatches(arrangement), byes },
      notes: repeatNotes(ctx.history, arrangement, singles ? 2 : 4, capacity.courtsUsed, courts),
    };
  },
};
