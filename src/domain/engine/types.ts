import type { FormatId, ID, Player, Round, Team, Tournament } from "../types";
import type { History } from "./shared/history";
import type { Rng } from "./shared/rng";

export interface EngineContext {
  t: Tournament;
  roundIndex: number;
  /**
   * Position in the round-robin cycle: the round index plus every redo so
   * far, so a redo moves to fresh partners instead of repeating the draw.
   */
  rotation: number;
  /** Players who can play this round (active, joined, not marked out). */
  players: Player[];
  /** Fixed-team formats: teams whose both members are available. */
  teams: Team[];
  /** Built from rounds before roundIndex, per player or per team. */
  history: History;
  rng: Rng;
  /**
   * Same relative order every round for the same set of IDs, so round-robin
   * (circle) schedules stay consistent across rounds.
   */
  stableOrder: (ids: readonly ID[]) => ID[];
}

export type RoundNote = "partnerRepeat" | "opponentRepeat" | "emptyCourts";

export type InfeasibleReason =
  | "notEnoughPlayers"
  | "notEnoughMen"
  | "notEnoughWomen"
  | "previousRoundIncomplete"
  | "tournamentFinished";

/** The engine fills matches and byes; the caller adds `out` and `attempt`. */
export type DraftRound = Pick<Round, "matches" | "byes">;

export type EngineResult =
  | { ok: true; round: DraftRound; notes: RoundNote[] }
  | { ok: false; reason: InfeasibleReason };

export type GenerateResult =
  | { ok: true; round: Round; notes: RoundNote[] }
  | { ok: false; reason: InfeasibleReason };

export interface FormatEngine {
  id: FormatId;
  generate: (ctx: EngineContext) => EngineResult;
}
