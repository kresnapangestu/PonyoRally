import { FORMAT_RULES } from "@/constants/formats";
import { generateRound, type InfeasibleReason, type RoundNote } from "../engine";
import { cleanName } from "../roster/parse";
import type { ID, Player, Team, Tournament } from "../types";
import { hasBlockingIssues, validateSetup, type SetupDraft, type SetupIssue } from "../validation/setup";

export interface CreateInput {
  /** Court names must already be resolved (defaults translated). */
  draft: SetupDraft;
  id: ID;
  seed: number;
  now: number;
  createId: () => ID;
}

export type CreateResult =
  | { ok: true; tournament: Tournament; notes: RoundNote[] }
  | { ok: false; error: "invalidSetup"; issues: SetupIssue[] }
  | { ok: false; error: InfeasibleReason };

/** Builds a tournament from a valid draft and draws round 1. */
export function createTournament({ draft, id, seed, now, createId }: CreateInput): CreateResult {
  const issues = validateSetup(draft);
  if (hasBlockingIssues(issues) || !draft.format) return { ok: false, error: "invalidSetup", issues };

  const rules = FORMAT_RULES[draft.format];
  const players: Player[] = draft.players.map((p) => ({
    id: p.id,
    name: cleanName(p.name),
    ...(rules.needsGender && p.gender ? { gender: p.gender } : {}),
    joinedRound: 0,
    status: "active",
  }));
  const teams: Team[] | undefined = rules.fixedTeams
    ? draft.teams.map((pair) => ({ id: createId(), players: [pair[0], pair[1]] }))
    : undefined;

  const base: Tournament = {
    id,
    name: draft.name.trim(),
    format: draft.format,
    mode: rules.supportsSingles ? draft.mode : "doubles",
    courts: draft.courtNames.map((c) => c.trim()),
    scoring: draft.scoring,
    targetPoints: draft.targetPoints!,
    seed,
    players,
    ...(teams ? { teams } : {}),
    rounds: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const first = generateRound(base);
  if (!first.ok) return { ok: false, error: first.reason };
  return { ok: true, tournament: { ...base, rounds: [first.round] }, notes: first.notes };
}
