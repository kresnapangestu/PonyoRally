"use client";

import { ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import type { StandingRow } from "@/domain/standings";
import type { Tournament } from "@/domain/types";
import { useT } from "@/i18n/useT";
import { downloadBlob } from "@/lib/download";
import { useToastStore } from "@/store/toast-store";
import { captureTheme } from "./capture-theme";
import { canShareFiles, shareFiles } from "./share-files";
import { createShareSnapshot, shareKindFor, type ShareSnapshot } from "./share-snapshot";
import { useShareExport } from "./useShareExport";

interface ShareSheetProps {
  tournament: Tournament;
  /** The leaderboard's own standings rows: shared as-is, never re-ranked. */
  rows: readonly StandingRow[];
  entryName: (id: string) => string;
  onClose: () => void;
}

const DOWNLOAD_GAP_MS = 300;

/** Snapshot of data, theme and language, taken once when the sheet opens. */
function useSnapshot(props: ShareSheetProps): ShareSnapshot {
  const { t, lang } = useT();
  const [snapshot] = useState(() => {
    const { tournament, rows, entryName } = props;
    const kind = shareKindFor(tournament.format);
    const rounds = tournament.rounds.length;
    return createShareSnapshot({
      tournament,
      rows,
      entryName,
      lang,
      ...captureTheme(),
      labels: {
        appName: "Ponyo Rally",
        kind: t(kind === "leaderboard" ? "share.kindLeaderboard" : "share.kindStandings"),
        tournamentName: tournament.name,
        status: `${t(`formats.${tournament.format}.name`)} · ${t(
          tournament.status === "finished" ? "share.statusFinal" : "share.statusLive",
          { n: rounds },
        )}`,
        columns: {
          rank: t("share.colRank"),
          name: t(kind === "leaderboard" ? "share.colPlayer" : "share.colTeam"),
          played: t("share.colPlayed"),
          diff: t("share.colDiff"),
          points: t("share.colPoints"),
        },
        withdrawn: t("share.withdrawn"),
        footerLeft: window.location.host,
        footerRight: new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date()),
        pageOf: t("share.pageOf"),
      },
    });
  });
  return snapshot;
}

export function ShareSheet(props: ShareSheetProps) {
  const { t, tp } = useT();
  const showToast = useToastStore((s) => s.show);
  const snapshot = useSnapshot(props);
  const [attempt, setAttempt] = useState(0);
  const state = useShareExport(snapshot, attempt);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const pages = state.status === "ready" ? state.pages : [];
  const current = pages[Math.min(index, pages.length - 1)];
  const files = pages.map((p) => p.file);
  const canShareOne = current ? canShareFiles([current.file]) : false;
  const canShareAll = pages.length > 1 && canShareFiles(files);
  const shareData = { title: snapshot.tournamentName, text: t("share.shareText", { name: snapshot.tournamentName }) };

  /** One action at a time, so repeated taps can't open two share sheets or double-download. */
  async function guarded(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const share = (toShare: File[]) =>
    guarded(async () => {
      const outcome = await shareFiles(toShare, shareData);
      // "shared" only means the sheet completed; we can't know if anyone received it.
      if (outcome === "failed" || outcome === "unsupported") showToast(t("share.shareFailed"));
    });

  const download = (toDownload: File[]) =>
    guarded(async () => {
      for (const [i, file] of toDownload.entries()) {
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_GAP_MS));
        downloadBlob(file.name, file);
      }
      showToast(tp("share.downloaded", toDownload.length));
    });

  const footer =
    state.status === "ready" && current ? (
      <div className="flex flex-col gap-2">
        {canShareOne && (
          <Button size="lg" block disabled={busy} onClick={() => share([current.file])}>
            <ShareIcon className="size-5" aria-hidden="true" />
            {t("share.shareOne")}
          </Button>
        )}
        {canShareAll && (
          <Button block variant="secondary" disabled={busy} onClick={() => share(files)}>
            {t("share.shareAll", { count: pages.length })}
          </Button>
        )}
        <div className="flex gap-2">
          <Button block variant={canShareOne ? "secondary" : "primary"} className="whitespace-nowrap" disabled={busy} onClick={() => download([current.file])}>
            <ArrowDownTrayIcon className="size-5" aria-hidden="true" />
            {t("share.download")}
          </Button>
          {pages.length > 1 && (
            <Button block variant="secondary" className="whitespace-nowrap" disabled={busy} onClick={() => download(files)}>
              {t("share.downloadAll", { count: pages.length })}
            </Button>
          )}
        </div>
      </div>
    ) : undefined;

  return (
    <Sheet open onClose={props.onClose} title={t("share.title")} closeLabel={t("common.close")} footer={footer}>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-muted">{snapshot.labels.kind}</p>

        {state.status === "empty" && <Notice tone="info">{t("share.empty")}</Notice>}

        {state.status === "rendering" && (
          <div
            role="status"
            className="grid aspect-[4/5] w-full animate-pulse place-items-center rounded-card bg-surface-2 text-sm text-text-muted"
          >
            {state.total > 1 ? t("share.preparingPage", { page: state.done + 1, total: state.total }) : t("share.preparing")}
          </div>
        )}

        {state.status === "error" && (
          <Notice
            tone="error"
            action={
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="text-sm font-semibold text-primary-soft">
                {t("share.retry")}
              </button>
            }
          >
            {t("share.failed")}
          </Notice>
        )}

        {current && (
          <>
            {/* The preview is the exported PNG itself, not a lookalike. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL of the generated file */}
            <img
              key={current.url}
              src={current.url}
              width={1080}
              height={1350}
              alt={t("share.previewAlt", { page: index + 1, total: pages.length })}
              className="aspect-[4/5] h-auto w-full animate-fade-in rounded-card border border-border shadow-card"
            />
            {pages.length > 1 && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  aria-label={t("share.previous")}
                  className="grid size-12 place-items-center rounded-button bg-surface-2 text-primary-soft disabled:opacity-40"
                >
                  <ChevronLeftIcon className="size-6" aria-hidden="true" />
                </button>
                <p className="tabular font-bold" aria-live="polite">
                  {t("share.pageOf", { page: index + 1, total: pages.length })}
                </p>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
                  disabled={index === pages.length - 1}
                  aria-label={t("share.next")}
                  className="grid size-12 place-items-center rounded-button bg-surface-2 text-primary-soft disabled:opacity-40"
                >
                  <ChevronRightIcon className="size-6" aria-hidden="true" />
                </button>
              </div>
            )}
            {!canShareOne && <Notice tone="info">{t("share.unsupported")}</Notice>}
          </>
        )}
      </div>
    </Sheet>
  );
}
