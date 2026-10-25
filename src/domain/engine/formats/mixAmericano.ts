import { PLAYERS } from "@/constants/limits";
import type { FormatEngine } from "../types";
import { doublesMatches } from "../shared/build";
import { repeatNotes, scheduleMixedDoubles } from "../shared/schedule";

/**
 * Mix Americano: rotating partners, every team one man + one woman. With
 * unequal numbers, the surplus gender rotates through byes.
 */
export const mixAmericano: FormatEngine = {
  id: "mixAmericano",
  generate(ctx) {
    const men = ctx.players.filter((p) => p.gender === "M").map((p) => p.id);
    const women = ctx.players.filter((p) => p.gender === "F").map((p) => p.id);
    if (men.length < PLAYERS.minPerGender) return { ok: false, reason: "notEnoughMen" };
    if (women.length < PLAYERS.minPerGender) return { ok: false, reason: "notEnoughWomen" };

    const courts = ctx.t.courts.length;
    const schedule = scheduleMixedDoubles({
      men,
      women,
      courts,
      history: ctx.history,
      rng: ctx.rng,
      rotation: ctx.rotation,
      stableOrder: ctx.stableOrder,
    });
    if (!schedule) return { ok: false, reason: "notEnoughPlayers" };

    return {
      ok: true,
      round: { matches: doublesMatches(schedule.arrangement), byes: schedule.byes },
      notes: repeatNotes(ctx.history, schedule.arrangement, 4, schedule.courtsUsed, courts),
    };
  },
};
