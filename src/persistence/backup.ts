import type { ID, Tournament } from "@/domain/types";
import { CURRENT_VERSION } from "./migrations";
import { decodeTournament, type Repository } from "./repository";

/**
 * Backup file: { app, kind, v, exportedAt, tournaments }. Each tournament is
 * decoded with the file's version through the same migrations and checks as
 * stored data, so an import can never bring in something the app could not
 * have saved itself.
 */

export const BACKUP_APP = "ponyo-rally";
export const BACKUP_KIND = "backup";
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export interface BackupFile {
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  v: number;
  exportedAt: string;
  tournaments: Tournament[];
}

export type BackupError = "tooLarge" | "notJson" | "notBackup" | "newerVersion" | "invalid" | "empty";

export type ParseBackupResult = { ok: true; tournaments: Tournament[] } | { ok: false; error: BackupError };

export function createBackup(tournaments: Tournament[], now: Date): BackupFile {
  return { app: BACKUP_APP, kind: BACKUP_KIND, v: CURRENT_VERSION, exportedAt: now.toISOString(), tournaments };
}

/** e.g. ponyo-rally-2026-10-25.json */
export function backupFileName(now: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${BACKUP_APP}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export function parseBackup(text: string): ParseBackupResult {
  if (new Blob([text]).size > BACKUP_MAX_BYTES) return { ok: false, error: "tooLarge" };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "notJson" };
  }

  const file = value as Partial<BackupFile> | null;
  if (!file || file.app !== BACKUP_APP || file.kind !== BACKUP_KIND || !Array.isArray(file.tournaments)) {
    return { ok: false, error: "notBackup" };
  }
  if (typeof file.v !== "number") return { ok: false, error: "notBackup" };
  if (file.v > CURRENT_VERSION) return { ok: false, error: "newerVersion" };
  if (file.tournaments.length === 0) return { ok: false, error: "empty" };

  const tournaments: Tournament[] = [];
  for (const data of file.tournaments) {
    const result = decodeTournament({ v: file.v, data });
    if (!result.ok) return { ok: false, error: result.reason === "newerVersion" ? "newerVersion" : "invalid" };
    tournaments.push(result.tournament);
  }
  return { ok: true, tournaments };
}

export interface ImportPlan {
  total: number;
  /** IDs already on this device; merging asks before replacing them. */
  conflicts: ID[];
}

export function planImport(tournaments: Tournament[], existingIds: ReadonlySet<ID>): ImportPlan {
  return { total: tournaments.length, conflicts: tournaments.filter((t) => existingIds.has(t.id)).map((t) => t.id) };
}

export type ImportMode = "merge" | "mergeReplace" | "replaceAll";

/**
 * merge:        add new tournaments, keep existing ones with the same ID
 * mergeReplace: add new ones and overwrite the same IDs
 * replaceAll:   delete everything on this device first
 */
export function applyImport(repo: Repository, tournaments: Tournament[], mode: ImportMode) {
  const existing = new Set(repo.list().map((s) => s.id));
  if (mode === "replaceAll") for (const id of existing) repo.remove(id);

  let imported = 0;
  for (const t of tournaments) {
    if (mode === "merge" && existing.has(t.id)) continue;
    const result = repo.save(t);
    if (!result.ok) return { ok: false as const, reason: result.reason, imported };
    imported += 1;
  }
  return { ok: true as const, imported };
}
