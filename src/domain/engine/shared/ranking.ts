import { computeStandings } from "../../standings";
import type { ID } from "../../types";
import type { EngineContext } from "../types";
import { pairKey, type History } from "./history";

/**
 * Current order for standings-based formats, from completed rounds only
 * (the engine refuses to run while the previous round has pending matches).
 * Player IDs, or team IDs in fixed-team formats.
 */
export function rankedIds(ctx: EngineContext, playing: readonly ID[]): ID[] {
  const inRound = new Set(playing);
  return computeStandings(ctx.t, { throughRound: ctx.roundIndex })
    .map((row) => row.id)
    .filter((id) => inRound.has(id));
}

export function timesPartnered(history: History, a: ID, b: ID) {
  return history.partners.get(pairKey(a, b)) ?? 0;
}

export function timesMet(history: History, a: ID, b: ID) {
  return history.opponents.get(pairKey(a, b)) ?? 0;
}
