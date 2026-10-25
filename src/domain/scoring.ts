import type { Match, MatchStatus, Score, ScoringMode } from "./types";

/**
 * Two ways to win a match (see ScoringMode):
 *  - race:  exactly one side reaches the target; the other stays below it.
 *  - total: both scores add up to the target; a draw is possible when the
 *           target is even.
 */

export type ScoreError =
  | "notInteger"
  | "negative"
  | "exceedsTarget"
  | "wrongTotal"
  | "noWinner"
  | "bothReachedTarget";

export interface ScoringRule {
  scoring: ScoringMode;
  targetPoints: number;
}

export function validateScore(score: Score, { scoring, targetPoints }: ScoringRule): ScoreError | null {
  for (const value of score) {
    if (!Number.isInteger(value)) return "notInteger";
    if (value < 0) return "negative";
    if (value > targetPoints) return "exceedsTarget";
  }
  const [a, b] = score;
  if (scoring === "total") return a + b === targetPoints ? null : "wrongTotal";

  const reached = Number(a === targetPoints) + Number(b === targetPoints);
  if (reached === 0) return "noWinner";
  if (reached === 2) return "bothReachedTarget";
  return null;
}

/**
 * The other side's score when it can be inferred, or null.
 *  - total: always the remainder (14 → 10 for a total of 24).
 *  - race:  a score below the target means the other side won (2 → 4);
 *           the winner's score says nothing about the loser's.
 */
export function inferOtherScore(points: number, { scoring, targetPoints }: ScoringRule): number | null {
  if (scoring === "total") return targetPoints - points;
  return points < targetPoints ? targetPoints : null;
}

export function getMatchStatus(match: Match): MatchStatus {
  if (match.skipped) return "skipped";
  return match.s ? "complete" : "pending";
}

/** 0 or 1 for the winning side, "draw" on equal scores, null if not complete. */
export function getWinner(match: Match): 0 | 1 | "draw" | null {
  if (getMatchStatus(match) !== "complete" || !match.s) return null;
  const [a, b] = match.s;
  if (a === b) return "draw";
  return a > b ? 0 : 1;
}

/** A round can be advanced once every match is either scored or skipped. */
export function isRoundResolved(matches: Match[]) {
  return matches.every((m) => getMatchStatus(m) !== "pending");
}
