import { validateScore, type ScoreError } from "../scoring";
import type { Match, Score, Tournament } from "../types";
import { failure, findMatch, replaceMatch, success, type MatchRef, type OpResult } from "./result";

type MatchError = "notFound" | "finished";

/** Copy of the match without the given optional fields. */
function without(match: Match, ...keys: ("s" | "skipped")[]): Match {
  const next = { ...match };
  for (const key of keys) delete next[key];
  return next;
}

export function setScore(t: Tournament, ref: MatchRef, score: Score): OpResult<MatchError | ScoreError> {
  if (t.status === "finished") return failure("finished");
  const match = findMatch(t, ref);
  if (!match) return failure("notFound");

  const error = validateScore(score, t);
  if (error) return failure(error);

  return success(replaceMatch(t, ref, { ...without(match, "skipped"), s: [score[0], score[1]] }));
}

export function clearScore(t: Tournament, ref: MatchRef): OpResult<MatchError> {
  if (t.status === "finished") return failure("finished");
  const match = findMatch(t, ref);
  if (!match) return failure("notFound");

  return success(replaceMatch(t, ref, without(match, "s")));
}

/** Skipping never silently discards a recorded score: clear it first. */
export function skipMatch(t: Tournament, ref: MatchRef): OpResult<MatchError | "hasScore"> {
  if (t.status === "finished") return failure("finished");
  const match = findMatch(t, ref);
  if (!match) return failure("notFound");
  if (match.s) return failure("hasScore");

  return success(replaceMatch(t, ref, { ...match, skipped: true }));
}

export function unskipMatch(t: Tournament, ref: MatchRef): OpResult<MatchError> {
  if (t.status === "finished") return failure("finished");
  const match = findMatch(t, ref);
  if (!match) return failure("notFound");

  return success(replaceMatch(t, ref, without(match, "skipped")));
}
