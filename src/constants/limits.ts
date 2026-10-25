/** Target points per match (to reach, or to add up to). Typed by the host. */
export const TARGET_POINTS = {
  min: 1,
  max: 99,
} as const;

export const COURTS = { min: 1, max: 12 } as const;

export const PLAYERS = {
  max: 40,
  minDoubles: 4,
  minSingles: 2,
  /** Per gender, in mixed formats. */
  minPerGender: 2,
  minTeams: 2,
  /** Below this, rotating formats repeat partners quickly. */
  varietyThreshold: 8,
  /** Below this many teams, Team formats rematch quickly. */
  teamVarietyThreshold: 4,
} as const;

export const NAME_MAX_LENGTH = {
  game: 40,
  player: 40,
  court: 20,
} as const;
