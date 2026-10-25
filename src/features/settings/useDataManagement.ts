"use client";

import { useState } from "react";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import type { ID, Tournament } from "@/domain/types";
import { useT } from "@/i18n/useT";
import { downloadText } from "@/lib/download";
import { applyImport, parseBackup, planImport, type BackupError, type ImportMode, type ImportPlan } from "@/persistence/backup";
import { downloadBackup, loadAllTournaments } from "@/persistence/export";
import { getRepository } from "@/persistence/instance";
import { useToastStore } from "@/store/toast-store";

export type ImportState =
  | { stage: "idle" }
  | { stage: "preview"; tournaments: Tournament[]; plan: ImportPlan }
  | { stage: "error"; error: BackupError | "quota" };

/**
 * Backup, restore, reset and recovery of unreadable data. All local: files
 * are created and read in the browser, nothing is uploaded.
 */
export function useDataManagement() {
  const { tp } = useT();
  const showToast = useToastStore((s) => s.show);
  const repo = getRepository();

  const [importState, setImportState] = useState<ImportState>({ stage: "idle" });
  const [corrupt, setCorrupt] = useState<ID[]>(() => repo.listCorrupt());
  const [count, setCount] = useState(() => repo.list().length);

  function exportAll() {
    const tournaments = loadAllTournaments(repo);
    if (tournaments.length === 0) return false;
    downloadBackup(tournaments);
    showToast(tp("settings.exported", tournaments.length));
    return true;
  }

  async function readFile(file: File) {
    const result = parseBackup(await file.text());
    if (!result.ok) return setImportState({ stage: "error", error: result.error });
    const existing = new Set(repo.list().map((s) => s.id));
    setImportState({ stage: "preview", tournaments: result.tournaments, plan: planImport(result.tournaments, existing) });
  }

  function confirmImport(mode: ImportMode) {
    if (importState.stage !== "preview") return;
    const result = applyImport(repo, importState.tournaments, mode);
    if (!result.ok) return setImportState({ stage: "error", error: "quota" });
    setImportState({ stage: "idle" });
    setCount(repo.list().length);
    showToast(tp("settings.imported", result.imported));
  }

  function resetAll() {
    repo.clearAll();
    // Stores hold the old values in memory; a full reload (not a client-side
    // navigation) is what guarantees everything starts clean.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  function downloadCorrupt(id: ID) {
    const raw = repo.readCorrupt(id);
    if (raw !== null) downloadText(`${STORAGE_KEYS.corrupt(id).replace(/:/g, "-")}.json`, raw);
  }

  function discardCorrupt(id: ID) {
    repo.discardCorrupt(id);
    setCorrupt(repo.listCorrupt());
  }

  return {
    tournamentCount: count,
    exportAll,
    readFile,
    importState,
    closeImport: () => setImportState({ stage: "idle" }),
    confirmImport,
    resetAll,
    corrupt,
    downloadCorrupt,
    discardCorrupt,
  };
}
