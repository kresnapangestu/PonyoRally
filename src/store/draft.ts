import { FORMAT_RULES } from "@/constants/formats";
import { COURTS, PLAYERS } from "@/constants/limits";
import type { FormatId, Gender, ID, PlayMode, ScoringMode } from "@/domain/types";
import type { DraftPlayer, SetupDraft } from "@/domain/validation/setup";

/**
 * The wizard's in-progress game. Court names are stored only when the host
 * typed one, so the defaults ("Lapangan 1" / "Court 1") follow the language.
 * Pure transitions live here so the store stays a thin wrapper.
 */
export interface Draft {
  step: number;
  format: FormatId | null;
  name: string;
  mode: PlayMode;
  courtCount: number;
  courtNameOverrides: Record<number, string>;
  scoring: ScoringMode;
  /** Typed by the host; empty until they do. */
  targetPoints: number | null;
  players: DraftPlayer[];
  teams: [ID, ID][];
}

const minimumRows = (mode: PlayMode) => (mode === "singles" ? PLAYERS.minSingles : PLAYERS.minDoubles);
const isBlank = (p: DraftPlayer) => p.name.trim() === "";

/**
 * Keeps one court's worth of rows ready to type into (2 singles, 4 doubles),
 * and trims trailing blank rows beyond that. Never removes a typed name.
 */
export function withMinimumRows(draft: Draft, createId: () => ID): Draft {
  const players = [...draft.players];
  const target = minimumRows(draft.mode);
  while (players.length > target && isBlank(players[players.length - 1])) players.pop();
  while (players.length < target) players.push({ id: createId(), name: "" });
  const ids = new Set(players.map((p) => p.id));
  return { ...draft, players, teams: draft.teams.filter((team) => team.every((id) => ids.has(id))) };
}

export function emptyDraft(createId: () => ID): Draft {
  return withMinimumRows(
    {
      step: 0,
      format: null,
      name: "",
      mode: "doubles",
      courtCount: 2,
      courtNameOverrides: {},
      scoring: "race",
      targetPoints: null,
      players: [],
      teams: [],
    },
    createId,
  );
}

export function resolveCourtNames(draft: Draft, defaultName: (index: number) => string) {
  return Array.from({ length: draft.courtCount }, (_, i) => draft.courtNameOverrides[i] ?? defaultName(i));
}

export function toSetupDraft(draft: Draft, defaultCourtName: (index: number) => string): SetupDraft {
  return {
    name: draft.name,
    format: draft.format,
    mode: draft.mode,
    courtNames: resolveCourtNames(draft, defaultCourtName),
    scoring: draft.scoring,
    targetPoints: draft.targetPoints,
    players: draft.players,
    teams: draft.teams,
  };
}

/** Switching to a doubles-only format also switches the mode back to doubles. */
export function withFormat(draft: Draft, format: FormatId): Draft {
  return { ...draft, format, mode: FORMAT_RULES[format].supportsSingles ? draft.mode : "doubles" };
}

export function hasDraftContent(draft: Draft) {
  return draft.format !== null || draft.name.trim() !== "" || draft.players.some((p) => !isBlank(p));
}

export function withCourtCount(draft: Draft, count: number): Draft {
  const courtCount = Math.min(COURTS.max, Math.max(COURTS.min, Math.round(count)));
  const courtNameOverrides = Object.fromEntries(
    Object.entries(draft.courtNameOverrides).filter(([index]) => Number(index) < courtCount),
  );
  return { ...draft, courtCount, courtNameOverrides };
}

export function withCourtName(draft: Draft, index: number, name: string): Draft {
  const courtNameOverrides = { ...draft.courtNameOverrides };
  if (name.trim()) courtNameOverrides[index] = name;
  else delete courtNameOverrides[index];
  return { ...draft, courtNameOverrides };
}

/** Names fill blank rows first, then append; an empty name adds a new row. */
export function withPlayersAdded(draft: Draft, names: string[], createId: () => ID): Draft {
  const players = [...draft.players];
  for (const name of names) {
    const blank = name.trim() ? players.findIndex(isBlank) : -1;
    if (blank === -1) players.push({ id: createId(), name });
    else players[blank] = { ...players[blank], name };
  }
  return { ...draft, players };
}

export function withPlayerChanged(draft: Draft, id: ID, change: { name?: string; gender?: Gender }): Draft {
  return { ...draft, players: draft.players.map((p) => (p.id === id ? { ...p, ...change } : p)) };
}

export function withPlayerRemoved(draft: Draft, id: ID): Draft {
  return {
    ...draft,
    players: draft.players.filter((p) => p.id !== id),
    teams: draft.teams.filter((team) => !team.includes(id)),
  };
}

export function withPair(draft: Draft, a: ID, b: ID): Draft {
  const paired = new Set(draft.teams.flat());
  if (a === b || paired.has(a) || paired.has(b)) return draft;
  return { ...draft, teams: [...draft.teams, [a, b]] };
}

export function withoutPair(draft: Draft, index: number): Draft {
  return { ...draft, teams: draft.teams.filter((_, i) => i !== index) };
}

export function unpairedPlayers(draft: Draft): DraftPlayer[] {
  const paired = new Set(draft.teams.flat());
  return draft.players.filter((p) => !paired.has(p.id));
}

/** "Pair the rest randomly" helper; an odd player stays unpaired. */
export function withRemainingPaired(draft: Draft, shuffle: <T>(items: T[]) => T[]): Draft {
  const rest = shuffle(unpairedPlayers(draft).map((p) => p.id));
  const teams = [...draft.teams];
  for (let i = 0; i + 1 < rest.length; i += 2) teams.push([rest[i], rest[i + 1]]);
  return { ...draft, teams };
}
