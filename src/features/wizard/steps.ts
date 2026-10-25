import { FORMAT_RULES } from "@/constants/formats";
import type { FormatId } from "@/domain/types";
import type { SetupField } from "@/domain/validation/setup";

export type WizardStep = "format" | "details" | "players" | "teams" | "review";

/** Team formats get an extra "pair the teams" step after the player list. */
export function stepsFor(format: FormatId | null): WizardStep[] {
  const teams = format !== null && FORMAT_RULES[format].fixedTeams;
  return ["format", "details", "players", ...(teams ? (["teams"] as const) : []), "review"];
}

/** Which validation fields each step is responsible for. */
export const STEP_FIELDS: Record<WizardStep, SetupField[]> = {
  format: ["format"],
  details: ["name", "mode", "courts", "points"],
  players: ["players"],
  teams: ["teams"],
  review: [],
};

export function stepForField(field: SetupField): WizardStep {
  const entry = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(field));
  return (entry?.[0] as WizardStep | undefined) ?? "review";
}
