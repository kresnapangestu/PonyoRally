/** Durations in ms. Keep in sync with the --duration-* tokens in globals.css. */
export const DURATION = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export const SPLASH = {
  /** Total time the splash stays up when motion is allowed. */
  holdMs: 4800,
  /** Shorter hold when the user prefers reduced motion. */
  reducedHoldMs: 300,
  exitMs: DURATION.base,
} as const;
