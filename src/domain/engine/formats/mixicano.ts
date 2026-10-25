import { PLAYERS } from "@/constants/limits";
import { mixedCapacity } from "../../capacity";
import type { Gender, ID } from "../../types";
import type { EngineResult, FormatEngine } from "../types";
import { doublesMatches } from "../shared/build";
import { selectByes } from "../shared/byes";
import type { History } from "../shared/history";
import { rankedIds, timesPartnered } from "../shared/ranking";
import { shuffle } from "../shared/rng";
import { repeatNotes } from "../shared/schedule";

/**
 * Mixicano: Mexicano with mixed teams. Round 1 is a random mixed draw; later
 * rounds fill courts top-down from the ranking, two men and two women each.
 */

interface RankedPlayer {
  id: ID;
  gender: Gender;
}

/**
 * Walks the ranking and drops each player into the first court that still
 * has a slot for their gender, so Court 1 holds the strongest of each.
 * Returns per court [men (best first), women (best first)].
 */
export function fillMixedCourts(ranked: readonly RankedPlayer[], courts: number) {
  const slots = Array.from({ length: courts }, () => ({ M: [] as ID[], F: [] as ID[] }));
  for (const player of ranked) {
    const court = slots.find((slot) => slot[player.gender].length < 2);
    court?.[player.gender].push(player.id);
  }
  return slots;
}

/**
 * Within a court (men a > b, women x > y by rank): a + y vs b + x balances
 * the teams. Switches to a + x vs b + y when that repeats fewer partnerships.
 * Returns [M, W, M, W].
 */
export function pairMixedCourt([a, b]: readonly ID[], [x, y]: readonly ID[], history: History): ID[] {
  const balanced = [a, y, b, x];
  const alternative = [a, x, b, y];
  const repeats = (layout: ID[]) =>
    timesPartnered(history, layout[0], layout[1]) + timesPartnered(history, layout[2], layout[3]);
  return repeats(alternative) < repeats(balanced) ? alternative : balanced;
}

export const mixicano: FormatEngine = {
  id: "mixicano",
  generate(ctx): EngineResult {
    const men = ctx.players.filter((p) => p.gender === "M").map((p) => p.id);
    const women = ctx.players.filter((p) => p.gender === "F").map((p) => p.id);
    if (men.length < PLAYERS.minPerGender) return { ok: false, reason: "notEnoughMen" };
    if (women.length < PLAYERS.minPerGender) return { ok: false, reason: "notEnoughWomen" };

    const courts = ctx.t.courts.length;
    const capacity = mixedCapacity(men.length, women.length, courts);
    const byes = [
      ...selectByes(men, capacity.byesMen ?? 0, ctx.history, ctx.rng),
      ...selectByes(women, capacity.byesWomen ?? 0, ctx.history, ctx.rng),
    ];
    const resting = new Set(byes);
    const playingMen = men.filter((id) => !resting.has(id));
    const playingWomen = women.filter((id) => !resting.has(id));

    let arrangement: ID[];
    if (ctx.roundIndex === 0) {
      const m = shuffle(playingMen, ctx.rng);
      const w = shuffle(playingWomen, ctx.rng);
      arrangement = m.flatMap((man, i) => [man, w[i]]);
    } else {
      const genderOf = new Map(ctx.players.map((p) => [p.id, p.gender!]));
      const ranked = rankedIds(ctx, [...playingMen, ...playingWomen]).map((id) => ({
        id,
        gender: genderOf.get(id)!,
      }));
      arrangement = fillMixedCourts(ranked, capacity.courtsUsed).flatMap((court) =>
        pairMixedCourt(court.M, court.F, ctx.history),
      );
    }

    return {
      ok: true,
      round: { matches: doublesMatches(arrangement), byes },
      notes: repeatNotes(ctx.history, arrangement, 4, capacity.courtsUsed, courts),
    };
  },
};
