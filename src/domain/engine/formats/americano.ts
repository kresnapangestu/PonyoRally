import type { FormatEngine } from "../types";
import { doublesMatches, singlesMatches } from "../shared/build";
import { repeatNotes, scheduleDoubles, scheduleHeadToHead } from "../shared/schedule";

/**
 * Americano: individuals, standings never affect pairings.
 *  - Doubles: partners rotate (round-robin when the roster allows it).
 *  - Singles: opponents rotate (round-robin when the roster allows it).
 */
export const americano: FormatEngine = {
  id: "americano",
  generate(ctx) {
    const input = {
      entries: ctx.players.map((p) => p.id),
      courts: ctx.t.courts.length,
      history: ctx.history,
      rng: ctx.rng,
      rotation: ctx.rotation,
      stableOrder: ctx.stableOrder,
    };
    const singles = ctx.t.mode === "singles";
    const schedule = singles ? scheduleHeadToHead(input) : scheduleDoubles(input);
    if (!schedule) return { ok: false, reason: "notEnoughPlayers" };

    return {
      ok: true,
      round: {
        matches: singles ? singlesMatches(schedule.arrangement) : doublesMatches(schedule.arrangement),
        byes: schedule.byes,
      },
      notes: repeatNotes(ctx.history, schedule.arrangement, singles ? 2 : 4, schedule.courtsUsed, input.courts),
    };
  },
};
