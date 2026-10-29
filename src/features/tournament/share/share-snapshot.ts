import { FORMAT_RULES } from "@/constants/formats";
import type { StandingRow } from "@/domain/standings";
import type { FormatId, Tournament } from "@/domain/types";

/**
 * A frozen copy of everything one export needs. The rows come from the
 * leaderboard's own computeStandings() result and are only copied, never
 * re-ranked, so the card shows exactly what the app shows. Every page of an
 * export is drawn from the same snapshot, even if the tournament changes
 * while images are being generated.
 */

export type ShareCardKind = "leaderboard" | "standings";

export interface ShareEntry {
  id: string;
  rank: number;
  tied: boolean;
  name: string;
  points: number;
  played: number;
  diff: number;
  withdrawn: boolean;
}

/** Explicit colors for the canvas (no inherited page styles). */
export interface SharePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  brand: string;
  brandText: string;
  brandTextMuted: string;
  gold: string;
  goldText: string;
  silver: string;
  silverText: string;
  bronze: string;
  bronzeText: string;
}

/** Every string drawn on the card, already translated. */
export interface ShareLabels {
  appName: string;
  kind: string;
  tournamentName: string;
  status: string;
  columns: { rank: string; name: string; played: string; diff: string; points: string };
  withdrawn: string;
  footerLeft: string;
  footerRight: string;
  /** Contains {page} and {total}. */
  pageOf: string;
}

export interface ShareSnapshot {
  /** Changes whenever the data, theme or language changes; used to reuse rendered PNGs. */
  key: string;
  kind: ShareCardKind;
  tournamentName: string;
  entries: readonly ShareEntry[];
  labels: ShareLabels;
  theme: "light" | "dark";
  palette: SharePalette;
  fontFamily: string;
}

/** Fixed-team formats rank teams; every other format ranks individual players. */
export function shareKindFor(format: FormatId): ShareCardKind {
  return FORMAT_RULES[format].fixedTeams ? "standings" : "leaderboard";
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export interface SnapshotInput {
  tournament: Pick<Tournament, "id" | "name" | "format" | "updatedAt">;
  /** The official standings, exactly as the leaderboard computed them. */
  rows: readonly StandingRow[];
  entryName: (id: string) => string;
  labels: ShareLabels;
  theme: "light" | "dark";
  palette: SharePalette;
  fontFamily: string;
  lang: string;
}

export function createShareSnapshot(input: SnapshotInput): ShareSnapshot {
  const entries: ShareEntry[] = input.rows.map((row) => ({
    id: row.id,
    rank: row.rank,
    tied: row.tied,
    name: input.entryName(row.id),
    points: row.points,
    played: row.played,
    diff: row.diff,
    withdrawn: row.withdrawn,
  }));

  return deepFreeze({
    key: [input.tournament.id, input.tournament.updatedAt, input.theme, input.lang].join(":"),
    kind: shareKindFor(input.tournament.format),
    tournamentName: input.tournament.name,
    entries,
    labels: structuredClone(input.labels),
    theme: input.theme,
    palette: { ...input.palette },
    fontFamily: input.fontFamily,
  });
}
