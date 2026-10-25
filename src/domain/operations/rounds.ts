import { generateRound, type InfeasibleReason, type RoundNote } from "../engine";
import { getMatchStatus } from "../scoring";
import type { Tournament } from "../types";
import { failure, type OpResult } from "./result";

export type RoundError = InfeasibleReason | "stale" | "noRound" | "roundStarted";

type RoundResult = OpResult<RoundError> & { notes?: RoundNote[] };

/**
 * Adds the next round. `expectedRounds` is the round count the host was
 * looking at; a second tap after the round was added becomes a no-op error
 * instead of a duplicate round.
 */
export function generateNextRound(t: Tournament, expectedRounds: number): RoundResult {
  if (t.rounds.length !== expectedRounds) return failure("stale");

  const result = generateRound(t, { out: t.pendingOut ?? [] });
  if (!result.ok) return failure(result.reason);

  const next: Tournament = { ...t, rounds: [...t.rounds, result.round] };
  delete next.pendingOut;
  return { ok: true, tournament: next, notes: result.notes };
}

/** Redraws the latest round, allowed only before anything was recorded in it. */
export function redoLastRound(t: Tournament): RoundResult {
  if (t.status === "finished") return failure("tournamentFinished");
  const last = t.rounds.at(-1);
  if (!last) return failure("noRound");

  const untouched = last.matches.every((m) => getMatchStatus(m) === "pending" && !m.subs?.length);
  if (!untouched) return failure("roundStarted");

  const roundIndex = t.rounds.length - 1;
  const result = generateRound(t, { roundIndex, attempt: last.attempt + 1, out: last.out });
  if (!result.ok) return failure(result.reason);

  return { ok: true, tournament: { ...t, rounds: [...t.rounds.slice(0, -1), result.round] }, notes: result.notes };
}
