"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ROUTES } from "@/constants/routes";
import type { MatchRef } from "@/domain/operations";
import type { Score } from "@/domain/types";
import { useStorageSync } from "@/hooks/useStorageSync";
import { downloadBackup } from "@/persistence/export";
import { getRepository } from "@/persistence/instance";
import { useT } from "@/i18n/useT";
import { useToastStore } from "@/store/toast-store";
import { useTournamentStore } from "@/store/tournament-store";
import { opErrorMessage } from "./op-error";
import { useOpenTournament } from "./useOpenTournament";
import { buildNames, gameNumber, roundProgress } from "./view-model";

export type TournamentTab = "matches" | "leaderboard" | "players";

export type ActiveSheet =
  | { kind: "score"; ref: MatchRef; side: 0 | 1 }
  | { kind: "matchMenu"; ref: MatchRef }
  | { kind: "substitute"; ref: MatchRef }
  | { kind: "nextRound" }
  | { kind: "tournamentMenu" }
  | null;

/**
 * Everything the tournament screen does, kept out of the JSX: which tab and
 * round are showing, which sheet is open, and the actions with their
 * feedback (toasts with Undo instead of confirmation dialogs).
 */
export function useTournamentScreen() {
  const translator = useT();
  const { t } = translator;
  const router = useRouter();
  const { tournament, loadState } = useOpenTournament();
  const store = useTournamentStore.getState();
  const saveError = useTournamentStore((s) => s.saveError);
  const changedElsewhere = useTournamentStore((s) => s.changedElsewhere);
  const lastRoundNotes = useTournamentStore((s) => s.lastRoundNotes);
  const showToast = useToastStore((s) => s.show);

  const [tab, setTab] = useState<TournamentTab>("matches");
  const [viewedRound, setViewedRound] = useState<number | null>(null);
  const [sheet, setSheet] = useState<ActiveSheet>(null);

  const reload = useCallback(() => useTournamentStore.getState().reloadIfChanged(), []);
  useStorageSync(reload);

  const names = useMemo(() => (tournament ? buildNames(tournament) : null), [tournament]);

  if (!tournament || !names) return { tournament: null, loadState } as const;

  const latestRound = tournament.rounds.length - 1;
  const roundIndex = viewedRound === null ? latestRound : Math.min(viewedRound, latestRound);
  const progress = roundProgress(tournament.rounds[latestRound]);
  const finished = tournament.status === "finished";
  const close = () => setSheet(null);
  const fail = (error: string) => showToast(opErrorMessage(error, translator));

  function saveScore(ref: MatchRef, score: Score) {
    const result = store.setScore(ref, score);
    if (!result.ok) return fail(result.error);
    close();
    showToast(t("tournament.score.saved"));
  }

  function skip(ref: MatchRef) {
    const result = store.skipMatch(ref);
    if (!result.ok) return fail(result.error);
    // From the "round not finished" list, stay there while games are still left.
    const updated = useTournamentStore.getState().tournament;
    const stillPending = updated ? !roundProgress(updated.rounds[ref.round]).resolved : false;
    setSheet((current) => (current?.kind === "nextRound" && stillPending ? current : null));
    showToast(t("tournament.skippedToast", { n: gameNumber(tournament!, ref.round, ref.match) }), {
      label: t("tournament.undo"),
      run: () => store.unskipMatch(ref),
    });
  }

  function clearScore(ref: MatchRef) {
    const previous = tournament!.rounds[ref.round].matches[ref.match].s;
    const result = store.clearScore(ref);
    if (!result.ok) return fail(result.error);
    close();
    if (previous) {
      showToast(t("tournament.match.scoreCleared"), {
        label: t("tournament.undo"),
        run: () => store.setScore(ref, previous),
      });
    }
  }

  function nextRound() {
    if (!progress.resolved) return setSheet({ kind: "nextRound" });
    const result = store.generateNextRound(tournament!.rounds.length);
    if (!result.ok) return fail(result.error);
    setViewedRound(null);
    close();
    window.scrollTo({ top: 0 });
    showToast(t("tournament.nextRound.ready", { n: tournament!.rounds.length + 1 }));
  }

  function redo() {
    const result = store.redoLastRound();
    if (!result.ok) return fail(result.error);
    close();
    setViewedRound(null);
    showToast(t("tournament.menu.redone", { n: latestRound + 1 }));
  }

  return {
    tournament,
    loadState,
    names,
    tab,
    setTab: (next: TournamentTab) => {
      setTab(next);
      window.scrollTo({ top: 0 });
    },
    roundIndex,
    latestRound,
    viewRound: setViewedRound,
    progress,
    finished,
    notes: lastRoundNotes,
    saveError,
    changedElsewhere,
    dismissChangedElsewhere: store.dismissChangedElsewhere,
    sheet,
    openSheet: setSheet,
    closeSheet: close,
    saveScore,
    skip,
    unskip: (ref: MatchRef) => {
      store.unskipMatch(ref);
      close();
    },
    clearScore,
    nextRound,
    redo,
    finish: () => {
      store.finish();
      close();
      setTab("leaderboard");
    },
    reopen: () => {
      store.reopen();
      close();
    },
    exportOne: () => {
      downloadBackup([tournament]);
      close();
    },
    deleteTournament: () => {
      getRepository().remove(tournament.id);
      close();
      router.replace(ROUTES.home);
      showToast(t("tournament.menu.deleted"));
    },
  } as const;
}

export type TournamentScreenModel = Extract<ReturnType<typeof useTournamentScreen>, { names: unknown }>;
