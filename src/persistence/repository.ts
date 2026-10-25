import { STORAGE_KEYS, STORAGE_PREFIX } from "@/constants/storage-keys";
import type { FormatId, ID, Tournament } from "@/domain/types";
import { migrate, unwrap, wrap } from "./migrations";
import { parseTournament } from "./schema";
import { isQuotaError, type KeyValueStorage } from "./storage";

/**
 * Tournament persistence: one key per tournament so a save rewrites only a
 * few KB and a damaged entry affects only itself. The index is a cache for
 * the Home list and is rebuilt from the tournament keys whenever it looks
 * wrong, so an interrupted write can never lose a tournament.
 */

export interface TournamentSummary {
  id: ID;
  name: string;
  format: FormatId;
  status: Tournament["status"];
  rounds: number;
  updatedAt: number;
}

export type SaveResult = { ok: true; tournament: Tournament } | { ok: false; reason: "quota" | "unknown" };

export type LoadResult =
  | { ok: true; tournament: Tournament }
  | { ok: false; reason: "notFound" | "corrupt" | "newerVersion" };

const TOURNAMENT_PREFIX = STORAGE_KEYS.tournament("");
const CORRUPT_PREFIX = STORAGE_KEYS.corrupt("");

function summarize(t: Tournament): TournamentSummary {
  return { id: t.id, name: t.name, format: t.format, status: t.status, rounds: t.rounds.length, updatedAt: t.updatedAt };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Decodes a stored or imported envelope into a valid, current tournament. */
export function decodeTournament(value: unknown): LoadResult {
  const envelope = unwrap(value);
  if (!envelope) return { ok: false, reason: "corrupt" };
  const migrated = migrate(envelope.data, envelope.v);
  if (!migrated.ok) return { ok: false, reason: migrated.reason === "newerVersion" ? "newerVersion" : "corrupt" };
  const tournament = parseTournament(migrated.data);
  return tournament ? { ok: true, tournament } : { ok: false, reason: "corrupt" };
}

export function createRepository(storage: KeyValueStorage, now: () => number = Date.now) {
  function tournamentIds() {
    return storage
      .keys()
      .filter((key) => key.startsWith(TOURNAMENT_PREFIX))
      .map((key) => key.slice(TOURNAMENT_PREFIX.length));
  }

  function readIndex(): TournamentSummary[] | null {
    const raw = storage.getItem(STORAGE_KEYS.index);
    const parsed = raw === null ? null : safeJson(raw);
    return Array.isArray(parsed) ? (parsed as TournamentSummary[]) : null;
  }

  function writeIndex(index: TournamentSummary[]) {
    try {
      storage.setItem(STORAGE_KEYS.index, JSON.stringify(index));
    } catch {
      // The index is only a cache; it is rebuilt on the next list().
    }
  }

  /** Moves unreadable data aside so it can be downloaded, never deleted silently. */
  function quarantine(id: ID, raw: string) {
    try {
      storage.setItem(STORAGE_KEYS.corrupt(id), raw);
    } catch {
      return; // Keep the original where it is rather than lose it.
    }
    storage.removeItem(STORAGE_KEYS.tournament(id));
  }

  function load(id: ID): LoadResult {
    const raw = storage.getItem(STORAGE_KEYS.tournament(id));
    if (raw === null) return { ok: false, reason: "notFound" };

    const result = decodeTournament(safeJson(raw));
    if (!result.ok && result.reason === "corrupt") quarantine(id, raw);
    return result;
  }

  function rebuildIndex(): TournamentSummary[] {
    const index = tournamentIds().flatMap((id) => {
      const result = load(id);
      return result.ok ? [summarize(result.tournament)] : [];
    });
    writeIndex(index);
    return index;
  }

  function list(): TournamentSummary[] {
    const index = readIndex();
    const ids = new Set(tournamentIds());
    const valid = index && index.length === ids.size && index.every((s) => ids.has(s.id));
    const summaries = valid ? index : rebuildIndex();
    return [...summaries].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function save(t: Tournament): SaveResult {
    const stamped: Tournament = { ...t, updatedAt: now() };
    try {
      storage.setItem(STORAGE_KEYS.tournament(t.id), JSON.stringify(wrap(stamped)));
    } catch (error) {
      return { ok: false, reason: isQuotaError(error) ? "quota" : "unknown" };
    }
    const index = (readIndex() ?? []).filter((s) => s.id !== t.id);
    writeIndex([...index, summarize(stamped)]);
    return { ok: true, tournament: stamped };
  }

  function remove(id: ID) {
    storage.removeItem(STORAGE_KEYS.tournament(id));
    writeIndex((readIndex() ?? []).filter((s) => s.id !== id));
  }

  function listCorrupt(): ID[] {
    return storage
      .keys()
      .filter((key) => key.startsWith(CORRUPT_PREFIX))
      .map((key) => key.slice(CORRUPT_PREFIX.length));
  }

  return {
    list,
    load,
    save,
    remove,
    listCorrupt,
    readCorrupt: (id: ID) => storage.getItem(STORAGE_KEYS.corrupt(id)),
    discardCorrupt: (id: ID) => storage.removeItem(STORAGE_KEYS.corrupt(id)),
    /** Removes every Ponyo Rally key (Settings → reset). */
    clearAll() {
      for (const key of storage.keys()) if (key.startsWith(STORAGE_PREFIX)) storage.removeItem(key);
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
