"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";
import type { TournamentScreenModel } from "../useTournamentScreen";

/**
 * Always-visible "Next round" action. It stays tappable while games are
 * unfinished: tapping explains what is left instead of doing nothing.
 */
export function NextRoundBar({ model }: { model: TournamentScreenModel }) {
  const { t } = useT();
  const { progress } = model;

  return (
    <div className="flex items-center gap-3 border-t border-border bg-bg/95 px-4 py-2.5 backdrop-blur">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" aria-live="polite">
          {t("tournament.nextRound.progress", { done: progress.done, total: progress.total })}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-320 ease-standard"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <Button onClick={model.nextRound} variant={progress.resolved ? "primary" : "secondary"}>
        {t("tournament.nextRound.button")}
        <ArrowRightIcon className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
