import type { Tournament } from "@/domain/types";
import { downloadText } from "@/lib/download";
import { backupFileName, createBackup } from "./backup";
import type { Repository } from "./repository";

/** Every readable tournament on this device, newest first. */
export function loadAllTournaments(repo: Repository): Tournament[] {
  return repo.list().flatMap((summary) => {
    const result = repo.load(summary.id);
    return result.ok ? [result.tournament] : [];
  });
}

export function downloadBackup(tournaments: Tournament[], now = new Date()) {
  downloadText(backupFileName(now), JSON.stringify(createBackup(tournaments, now), null, 2));
}
