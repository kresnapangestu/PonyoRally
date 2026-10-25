"use client";

import { ArrowsRightLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { shuffle } from "@/domain/engine/shared/rng";
import { displayNames } from "@/domain/roster/display";
import type { ID } from "@/domain/types";
import type { SetupIssue } from "@/domain/validation/setup";
import { useT } from "@/i18n/useT";
import { unpairedPlayers } from "@/store/draft";
import { useDraftStore } from "@/store/draft-store";
import { issueMessage } from "../issue-message";

/** Tap one name, then another: they become a team. */
export function TeamsStep({ issues, showErrors }: { issues: SetupIssue[]; showErrors: boolean }) {
  const translator = useT();
  const { t } = translator;
  const draft = useDraftStore();
  const [selected, setSelected] = useState<ID | null>(null);

  const nameOf = displayNames(draft.players);
  const unpaired = unpairedPlayers(draft);
  const visibleIssues = issues.filter((i) => i.severity !== "error" || showErrors);

  const tap = (id: ID) => {
    if (selected === null) return setSelected(id);
    if (selected === id) return setSelected(null);
    draft.pair(selected, id);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base" aria-live="polite">
        {selected ? t("wizard.teams.selected", { name: nameOf.get(selected) ?? "" }) : t("wizard.teams.instruction")}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-muted">{t("wizard.teams.unpairedTitle")}</h2>
        {unpaired.length === 0 ? (
          <p className="text-sm text-text-muted">{t("wizard.teams.allPaired")}</p>
        ) : (
          <div
            className="flex flex-wrap gap-2"
            data-invalid={showErrors && unpaired.length > 0 ? true : undefined}
            tabIndex={-1}
          >
            {unpaired.map((player) => (
              <button
                key={player.id}
                type="button"
                aria-pressed={selected === player.id}
                onClick={() => tap(player.id)}
                className="min-h-11 rounded-full border-2 border-border bg-surface px-4 text-base font-semibold transition-[transform,background-color,border-color] duration-120 active:scale-[0.96] aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-fg"
              >
                {nameOf.get(player.id) || "—"}
              </button>
            ))}
          </div>
        )}
        {unpaired.length > 1 && (
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => {
              setSelected(null);
              draft.pairRemaining((items) => shuffle(items, Math.random));
            }}
          >
            <ArrowsRightLeftIcon className="size-5" aria-hidden="true" />
            {t("wizard.teams.pairRest")}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-muted">{t("wizard.teams.teamsTitle")}</h2>
        {draft.teams.length === 0 ? (
          <p className="text-sm text-text-muted">{t("wizard.teams.noTeams")}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {draft.teams.map(([a, b], index) => (
              <li
                key={`${a}-${b}`}
                className="flex animate-pop-in items-center gap-3 rounded-card bg-surface py-2 pr-1 pl-4 shadow-card"
              >
                <span className="text-xs font-bold tracking-wide text-primary-soft uppercase">
                  {t("wizard.teams.teamLabel", { n: index + 1 })}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {nameOf.get(a)} & {nameOf.get(b)}
                </span>
                <button
                  type="button"
                  onClick={() => draft.unpair(index)}
                  aria-label={t("wizard.teams.unpair", { n: index + 1 })}
                  className="grid size-11 place-items-center rounded-button text-text-muted active:bg-surface-2"
                >
                  <XMarkIcon className="size-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {visibleIssues.map((issue) => (
        <Notice key={issue.code} tone={issue.severity}>
          {issueMessage(issue, translator)}
        </Notice>
      ))}
    </div>
  );
}
