import { FORMAT_RULES } from "@/constants/formats";
import type { FormatId, PlayMode } from "./types";

/**
 * How many courts a round fills and how many entries rest. "Entries" are
 * players, or teams in fixed-team formats. Extra courts simply stay empty.
 */
export interface RoundCapacity {
  courtsUsed: number;
  emptyCourts: number;
  /** Players (or teams) resting each round. */
  byes: number;
  /** Mixed formats only: resting count per gender. */
  byesMen?: number;
  byesWomen?: number;
}

function fromSlots(entries: number, courts: number, perCourt: number): RoundCapacity {
  const courtsUsed = Math.min(courts, Math.floor(entries / perCourt));
  return {
    courtsUsed,
    emptyCourts: courts - courtsUsed,
    byes: entries - courtsUsed * perCourt,
  };
}

export function individualCapacity(players: number, courts: number, mode: PlayMode) {
  return fromSlots(players, courts, mode === "doubles" ? 4 : 2);
}

export function teamCapacity(teams: number, courts: number) {
  return fromSlots(teams, courts, 2);
}

/** Each court needs two men and two women. */
export function mixedCapacity(men: number, women: number, courts: number): RoundCapacity {
  const courtsUsed = Math.min(courts, Math.floor(men / 2), Math.floor(women / 2));
  const byesMen = men - courtsUsed * 2;
  const byesWomen = women - courtsUsed * 2;
  return {
    courtsUsed,
    emptyCourts: courts - courtsUsed,
    byes: byesMen + byesWomen,
    byesMen,
    byesWomen,
  };
}

export interface CapacityInput {
  format: FormatId;
  mode: PlayMode;
  courts: number;
  players: number;
  teams: number;
  men: number;
  women: number;
}

export function roundCapacity(input: CapacityInput): RoundCapacity {
  const rules = FORMAT_RULES[input.format];
  if (rules.fixedTeams) return teamCapacity(input.teams, input.courts);
  if (rules.needsGender) return mixedCapacity(input.men, input.women, input.courts);
  return individualCapacity(input.players, input.courts, input.mode);
}
