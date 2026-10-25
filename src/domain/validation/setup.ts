import { FORMAT_RULES } from "@/constants/formats";
import { COURTS, NAME_MAX_LENGTH, PLAYERS, TARGET_POINTS } from "@/constants/limits";
import { individualCapacity, mixedCapacity, teamCapacity } from "../capacity";
import { nameKey } from "../roster/parse";
import type { FormatId, Gender, ID, PlayMode, ScoringMode } from "../types";

/**
 * Validates the creation wizard. Returns every issue at once so the UI can
 * show each one beside its field:
 *  - error:   blocks "Create game"
 *  - info:    valid, but worth knowing (byes, empty courts)
 *  - warning: valid, but the experience may suffer (repeated pairings)
 */

export interface DraftPlayer {
  id: ID;
  name: string;
  gender?: Gender;
}

export interface SetupDraft {
  name: string;
  format: FormatId | null;
  mode: PlayMode;
  /** One entry per court; the court count is its length. */
  courtNames: string[];
  scoring: ScoringMode;
  targetPoints: number | null;
  players: DraftPlayer[];
  /** Fixed-team formats only. */
  teams: [ID, ID][];
}

export type SetupField = "name" | "format" | "mode" | "courts" | "points" | "players" | "teams";
export type IssueSeverity = "error" | "info" | "warning";

export type SetupIssueCode =
  // errors
  | "nameRequired"
  | "nameTooLong"
  | "formatRequired"
  | "modeUnsupported"
  | "courtsRange"
  | "courtNameRequired"
  | "courtNameTooLong"
  | "courtNameDuplicate"
  | "pointsRange"
  | "playerNameRequired"
  | "playerNameTooLong"
  | "tooFewPlayers"
  | "tooManyPlayers"
  | "genderMissing"
  | "notEnoughMen"
  | "notEnoughWomen"
  | "unpairedPlayers"
  | "tooFewTeams"
  // info
  | "byesPerRound"
  | "mixedByesPerRound"
  | "teamByesPerRound"
  | "emptyCourts"
  // warnings
  | "limitedVariety"
  | "fewTeams";

export interface SetupIssue {
  field: SetupField;
  severity: IssueSeverity;
  code: SetupIssueCode;
  params?: Record<string, number>;
  /** Points at a specific row for inline display. */
  playerId?: ID;
  courtIndex?: number;
}

const error = (field: SetupField, code: SetupIssueCode, extra: Partial<SetupIssue> = {}): SetupIssue => ({
  field,
  severity: "error",
  code,
  ...extra,
});

function validateName(name: string): SetupIssue[] {
  const trimmed = name.trim();
  if (!trimmed) return [error("name", "nameRequired")];
  if (trimmed.length > NAME_MAX_LENGTH.game) {
    return [error("name", "nameTooLong", { params: { max: NAME_MAX_LENGTH.game } })];
  }
  return [];
}

function validateCourts(courtNames: string[]): SetupIssue[] {
  const count = courtNames.length;
  if (count < COURTS.min || count > COURTS.max) {
    return [error("courts", "courtsRange", { params: { min: COURTS.min, max: COURTS.max } })];
  }

  const issues: SetupIssue[] = [];
  const seen = new Set<string>();
  courtNames.forEach((courtName, courtIndex) => {
    const trimmed = courtName.trim();
    const key = nameKey(trimmed);
    if (!trimmed) {
      issues.push(error("courts", "courtNameRequired", { courtIndex }));
    } else if (trimmed.length > NAME_MAX_LENGTH.court) {
      issues.push(error("courts", "courtNameTooLong", { courtIndex, params: { max: NAME_MAX_LENGTH.court } }));
    } else if (seen.has(key)) {
      issues.push(error("courts", "courtNameDuplicate", { courtIndex }));
    }
    seen.add(key);
  });
  return issues;
}

function validateTargetPoints(points: number | null): SetupIssue[] {
  const valid =
    points !== null &&
    Number.isInteger(points) &&
    points >= TARGET_POINTS.min &&
    points <= TARGET_POINTS.max;
  return valid
    ? []
    : [error("points", "pointsRange", { params: { min: TARGET_POINTS.min, max: TARGET_POINTS.max } })];
}

function validatePlayerNames(players: DraftPlayer[]): SetupIssue[] {
  const issues: SetupIssue[] = [];
  for (const player of players) {
    const trimmed = player.name.trim();
    if (!trimmed) {
      issues.push(error("players", "playerNameRequired", { playerId: player.id }));
    } else if (trimmed.length > NAME_MAX_LENGTH.player) {
      issues.push(
        error("players", "playerNameTooLong", { playerId: player.id, params: { max: NAME_MAX_LENGTH.player } }),
      );
    }
  }
  if (players.length > PLAYERS.max) {
    issues.push(error("players", "tooManyPlayers", { params: { max: PLAYERS.max } }));
  }
  return issues;
}

function emptyCourtsInfo(emptyCourts: number, courtsUsed: number): SetupIssue[] {
  if (emptyCourts === 0 || courtsUsed === 0) return [];
  return [{ field: "courts", severity: "info", code: "emptyCourts", params: { count: emptyCourts } }];
}

function validateIndividualRoster(draft: SetupDraft): SetupIssue[] {
  const count = draft.players.length;
  const min = draft.mode === "doubles" ? PLAYERS.minDoubles : PLAYERS.minSingles;
  if (count < min) return [error("players", "tooFewPlayers", { params: { min } })];

  const issues: SetupIssue[] = [];
  const capacity = individualCapacity(count, draft.courtNames.length, draft.mode);
  if (capacity.byes > 0) {
    issues.push({ field: "players", severity: "info", code: "byesPerRound", params: { count: capacity.byes } });
  }
  issues.push(...emptyCourtsInfo(capacity.emptyCourts, capacity.courtsUsed));

  const varietyMin = draft.mode === "doubles" ? PLAYERS.varietyThreshold : PLAYERS.varietyThreshold / 2;
  if (count < varietyMin) {
    issues.push({ field: "players", severity: "warning", code: "limitedVariety" });
  }
  return issues;
}

function validateMixedRoster(draft: SetupDraft): SetupIssue[] {
  const missing = draft.players.filter((p) => !p.gender).length;
  if (missing > 0) return [error("players", "genderMissing", { params: { count: missing } })];

  const men = draft.players.filter((p) => p.gender === "M").length;
  const women = draft.players.length - men;
  const issues: SetupIssue[] = [];
  if (men < PLAYERS.minPerGender) {
    issues.push(error("players", "notEnoughMen", { params: { min: PLAYERS.minPerGender, count: men } }));
  }
  if (women < PLAYERS.minPerGender) {
    issues.push(error("players", "notEnoughWomen", { params: { min: PLAYERS.minPerGender, count: women } }));
  }
  if (issues.length > 0) return issues;

  const capacity = mixedCapacity(men, women, draft.courtNames.length);
  if (capacity.byes > 0) {
    issues.push({
      field: "players",
      severity: "info",
      code: "mixedByesPerRound",
      params: { men: capacity.byesMen ?? 0, women: capacity.byesWomen ?? 0 },
    });
  }
  issues.push(...emptyCourtsInfo(capacity.emptyCourts, capacity.courtsUsed));

  // Partner variety is capped by the scarcer gender.
  if (Math.min(men, women) < PLAYERS.varietyThreshold / 2) {
    issues.push({ field: "players", severity: "warning", code: "limitedVariety" });
  }
  return issues;
}

function validateTeamRoster(draft: SetupDraft): SetupIssue[] {
  const paired = new Set(draft.teams.flat());
  const unpaired = draft.players.filter((p) => !paired.has(p.id)).length;
  const issues: SetupIssue[] = [];

  if (unpaired > 0) issues.push(error("teams", "unpairedPlayers", { params: { count: unpaired } }));
  if (draft.teams.length < PLAYERS.minTeams) {
    issues.push(error("teams", "tooFewTeams", { params: { min: PLAYERS.minTeams } }));
  }
  if (issues.length > 0) return issues;

  const capacity = teamCapacity(draft.teams.length, draft.courtNames.length);
  if (capacity.byes > 0) {
    issues.push({ field: "teams", severity: "info", code: "teamByesPerRound", params: { count: capacity.byes } });
  }
  issues.push(...emptyCourtsInfo(capacity.emptyCourts, capacity.courtsUsed));

  if (draft.teams.length < PLAYERS.teamVarietyThreshold) {
    issues.push({ field: "teams", severity: "warning", code: "fewTeams", params: { count: draft.teams.length } });
  }
  return issues;
}

export function validateSetup(draft: SetupDraft): SetupIssue[] {
  const issues = [
    ...validateName(draft.name),
    ...validateCourts(draft.courtNames),
    ...validateTargetPoints(draft.targetPoints),
    ...validatePlayerNames(draft.players),
  ];

  if (!draft.format) return [...issues, error("format", "formatRequired")];

  const rules = FORMAT_RULES[draft.format];
  if (draft.mode === "singles" && !rules.supportsSingles) {
    return [...issues, error("mode", "modeUnsupported")];
  }

  // Capacity hints need a valid court count.
  if (issues.some((i) => i.code === "courtsRange")) return issues;

  if (rules.fixedTeams) return [...issues, ...validateTeamRoster(draft)];
  if (rules.needsGender) return [...issues, ...validateMixedRoster(draft)];
  return [...issues, ...validateIndividualRoster(draft)];
}

export function hasBlockingIssues(issues: SetupIssue[]) {
  return issues.some((issue) => issue.severity === "error");
}
