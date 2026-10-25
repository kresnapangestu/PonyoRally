import type { FormatEngine } from "../types";
import { teamMatches } from "../shared/build";
import { repeatNotes, scheduleHeadToHead } from "../shared/schedule";

/** Team Americano: fixed pairs meet every other pair, standings never affect pairings. */
export const teamAmericano: FormatEngine = {
  id: "teamAmericano",
  generate(ctx) {
    const courts = ctx.t.courts.length;
    const schedule = scheduleHeadToHead({
      entries: ctx.teams.map((team) => team.id),
      courts,
      history: ctx.history,
      rng: ctx.rng,
      rotation: ctx.rotation,
      stableOrder: ctx.stableOrder,
    });
    if (!schedule) return { ok: false, reason: "notEnoughPlayers" };

    return {
      ok: true,
      round: { matches: teamMatches(schedule.arrangement, ctx.teams), byes: schedule.byes },
      notes: repeatNotes(ctx.history, schedule.arrangement, 2, schedule.courtsUsed, courts),
    };
  },
};
