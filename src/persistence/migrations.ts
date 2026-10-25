/**
 * Stored data is wrapped as { v, data }. When the tournament schema changes:
 *  1. bump CURRENT_VERSION,
 *  2. add MIGRATIONS[oldVersion] turning old data into the next version,
 *  3. add a fixture test for the old shape.
 * Migrations run in order on read, so any older version upgrades in steps.
 */

export const CURRENT_VERSION = 2;

type Migration = (data: unknown) => unknown;

/** MIGRATIONS[n] upgrades version n to n + 1. */
export const MIGRATIONS: Record<number, Migration> = {
  // v2: the host picks how a match is won. Every v1 game used a fixed total.
  1: (data) => {
    if (typeof data !== "object" || data === null) return data;
    const { totalPoints, ...rest } = data as Record<string, unknown>;
    return { ...rest, scoring: "total", targetPoints: totalPoints };
  },
};

export type MigrateResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "newerVersion" | "invalidVersion" };

export function migrate(
  data: unknown,
  fromVersion: number,
  migrations: Record<number, Migration> = MIGRATIONS,
  target = CURRENT_VERSION,
): MigrateResult {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return { ok: false, reason: "invalidVersion" };
  if (fromVersion > target) return { ok: false, reason: "newerVersion" };

  let current = data;
  for (let v = fromVersion; v < target; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, reason: "invalidVersion" };
    current = step(current);
  }
  return { ok: true, data: current };
}

export function wrap(data: unknown) {
  return { v: CURRENT_VERSION, data };
}

/** Reads a { v, data } envelope; anything else is not ours. */
export function unwrap(value: unknown): { v: number; data: unknown } | null {
  if (typeof value !== "object" || value === null) return null;
  const { v, data } = value as { v?: unknown; data?: unknown };
  return typeof v === "number" && data !== undefined ? { v, data } : null;
}
