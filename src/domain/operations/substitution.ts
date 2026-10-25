import { FORMAT_RULES } from "@/constants/formats";
import type { ID, Match, Side, Substitution, Tournament } from "../types";
import { failure, findMatch, replaceMatch, success, type MatchRef, type OpResult } from "./result";

/**
 * Replacing players in a generated match. The match keeps an audit trail
 * (`subs`), and points always go to whoever is on the side, so history is
 * never rewritten silently. When a score already exists the host must decide:
 * keep it (credited to the substitute) or clear it.
 */

export type ScoreDecision = "keep" | "clear";

export type SubstitutionError =
  | "notFound"
  | "finished"
  | "notInMatch"
  | "samePlayer"
  | "unknownPlayer"
  | "alreadyInMatch"
  | "busy"
  | "genderMismatch"
  | "needsDecision";

function sideIndexOf(match: Match, playerId: ID): 0 | 1 | -1 {
  if (match.a.p.includes(playerId)) return 0;
  if (match.b.p.includes(playerId)) return 1;
  return -1;
}

function replaceOnSide(side: Side, out: ID, incoming: ID): Side {
  return { ...side, p: side.p.map((id) => (id === out ? incoming : id)) };
}

function applySub(match: Match, sub: Substitution, decision: ScoreDecision | undefined): Match {
  const next: Match = {
    ...match,
    a: sub.side === 0 ? replaceOnSide(match.a, sub.out, sub.in) : match.a,
    b: sub.side === 1 ? replaceOnSide(match.b, sub.out, sub.in) : match.b,
    subs: [...(match.subs ?? []), sub],
  };
  if (decision === "clear") delete next.s;
  return next;
}

/** Index of another match in the same round that already uses this player. */
export function findBusyMatch(t: Tournament, roundIndex: number, playerId: ID, except: number) {
  return (t.rounds[roundIndex]?.matches ?? []).findIndex(
    (m, i) => i !== except && sideIndexOf(m, playerId) !== -1,
  );
}

export interface SubstituteInput {
  out: ID;
  in: ID;
  decision?: ScoreDecision;
}

export function substitute(
  t: Tournament,
  ref: MatchRef,
  input: SubstituteInput,
): OpResult<SubstitutionError> {
  if (t.status === "finished") return failure("finished");
  const match = findMatch(t, ref);
  if (!match) return failure("notFound");

  const side = sideIndexOf(match, input.out);
  if (side === -1) return failure("notInMatch");
  if (input.out === input.in) return failure("samePlayer");

  const players = new Map(t.players.map((p) => [p.id, p]));
  const incoming = players.get(input.in);
  if (!incoming || incoming.status !== "active") return failure("unknownPlayer");
  if (sideIndexOf(match, input.in) !== -1) return failure("alreadyInMatch");
  if (findBusyMatch(t, ref.round, input.in, ref.match) !== -1) return failure("busy");
  if (FORMAT_RULES[t.format].needsGender && incoming.gender !== players.get(input.out)?.gender) {
    return failure("genderMismatch");
  }
  if (match.s && !input.decision) return failure("needsDecision");

  const sub: Substitution = { side, out: input.out, in: input.in, scoreKept: Boolean(match.s) && input.decision === "keep" };
  const updated = replaceMatch(t, ref, applySub(match, sub, input.decision));

  // A substitute who was resting is now playing.
  return success({
    ...updated,
    rounds: updated.rounds.map((round, r) =>
      r === ref.round ? { ...round, byes: round.byes.filter((id) => id !== input.in) } : round,
    ),
  });
}

/**
 * Swaps two players between matches of the same round (the fix when the
 * wanted substitute is already playing elsewhere).
 */
export function swapPlayers(
  t: Tournament,
  roundIndex: number,
  first: ID,
  second: ID,
  decision?: ScoreDecision,
): OpResult<SubstitutionError> {
  if (t.status === "finished") return failure("finished");
  const round = t.rounds[roundIndex];
  if (!round) return failure("notFound");
  if (first === second) return failure("samePlayer");

  const firstMatch = round.matches.findIndex((m) => sideIndexOf(m, first) !== -1);
  const secondMatch = round.matches.findIndex((m) => sideIndexOf(m, second) !== -1);
  if (firstMatch === -1 || secondMatch === -1) return failure("notInMatch");
  if (firstMatch === secondMatch) return failure("alreadyInMatch");

  const genderOf = new Map(t.players.map((p) => [p.id, p.gender]));
  if (FORMAT_RULES[t.format].needsGender && genderOf.get(first) !== genderOf.get(second)) {
    return failure("genderMismatch");
  }

  const a = round.matches[firstMatch];
  const b = round.matches[secondMatch];
  if ((a.s || b.s) && !decision) return failure("needsDecision");

  const subA: Substitution = { side: sideIndexOf(a, first) as 0 | 1, out: first, in: second, scoreKept: Boolean(a.s) && decision === "keep" };
  const subB: Substitution = { side: sideIndexOf(b, second) as 0 | 1, out: second, in: first, scoreKept: Boolean(b.s) && decision === "keep" };

  const withA = replaceMatch(t, { round: roundIndex, match: firstMatch }, applySub(a, subA, a.s ? decision : undefined));
  return success(replaceMatch(withA, { round: roundIndex, match: secondMatch }, applySub(b, subB, b.s ? decision : undefined)));
}
