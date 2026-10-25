/**
 * Persisted tournament model. Matches reference players by ID only; anything
 * that can be recalculated (standings, ranks, game numbers, match status) is
 * derived, never stored.
 */

export type ID = string;

export const FORMAT_IDS = [
  "americano",
  "teamAmericano",
  "mexicano",
  "teamMexicano",
  "mixicano",
  "mixAmericano",
] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export type PlayMode = "singles" | "doubles";

/**
 * How a match is won, chosen per game by the host:
 *  - race:  first side to reach the target wins (target 4 → 4–2)
 *  - total: rally points until both scores add up to the target (24 → 14–10)
 */
export const SCORING_MODES = ["race", "total"] as const;
export type ScoringMode = (typeof SCORING_MODES)[number];
export type Gender = "M" | "F";

export interface Player {
  id: ID;
  name: string;
  /** Only collected for mixed formats. */
  gender?: Gender;
  /** Round index the player became eligible from; 0 = from the start. */
  joinedRound: number;
  status: "active" | "withdrawn";
}

export interface Team {
  id: ID;
  players: [ID, ID];
}

export interface Side {
  /** Players currently on this side (after any substitution). */
  p: ID[];
  /** Team ID, fixed-team formats only. */
  t?: ID;
}

/** Audit record of a substitution; the side's `p` already holds `in`. */
export interface Substitution {
  side: 0 | 1;
  out: ID;
  in: ID;
  scoreKept: boolean;
}

export type Score = [number, number];

export interface Match {
  /** Index into Tournament.courts. */
  court: number;
  a: Side;
  b: Side;
  /** Absent while the match is pending. */
  s?: Score;
  skipped?: true;
  subs?: Substitution[];
}

export interface Round {
  matches: Match[];
  /**
   * Resting this round: the engine's decision, stored as history.
   * Team IDs in fixed-team formats, player IDs otherwise.
   */
  byes: ID[];
  /** Marked unavailable by the host for this round. */
  out: ID[];
  /** Redo counter; feeds the round's random seed. */
  attempt: number;
}

export interface Tournament {
  id: ID;
  name: string;
  format: FormatId;
  mode: PlayMode;
  courts: string[];
  scoring: ScoringMode;
  targetPoints: number;
  seed: number;
  players: Player[];
  teams?: Team[];
  rounds: Round[];
  /** Players the host marked "not playing" for the next round to be generated. */
  pendingOut?: ID[];
  plannedRounds?: number;
  status: "active" | "finished";
  createdAt: number;
  updatedAt: number;
}

export type MatchStatus = "pending" | "complete" | "skipped";
