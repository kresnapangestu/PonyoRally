"use client";

import { ClipboardDocumentListIcon, PlusIcon, UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { FORMAT_RULES } from "@/constants/formats";
import { NAME_MAX_LENGTH } from "@/constants/limits";
import { findDuplicateNameKeys, nameKey } from "@/domain/roster/parse";
import type { Gender } from "@/domain/types";
import type { SetupIssue } from "@/domain/validation/setup";
import { useT } from "@/i18n/useT";
import { useDraftStore } from "@/store/draft-store";
import { issueMessage } from "../issue-message";
import { PasteSheet } from "./PasteSheet";

export function PlayersStep({ issues, showErrors }: { issues: SetupIssue[]; showErrors: boolean }) {
  const translator = useT();
  const { t, tp } = translator;
  const players = useDraftStore((s) => s.players);
  const format = useDraftStore((s) => s.format);
  const { addPlayers, updatePlayer, removePlayer } = useDraftStore.getState();
  const needsGender = format ? FORMAT_RULES[format].needsGender : false;

  const [pasteOpen, setPasteOpen] = useState(false);
  const [focusLast, setFocusLast] = useState(false);
  const duplicates = useMemo(() => findDuplicateNameKeys(players.map((p) => p.name)), [players]);

  const rowError = (playerId: string) => {
    const issue = showErrors && issues.find((i) => i.playerId === playerId && i.severity === "error");
    return issue ? issueMessage(issue, translator) : undefined;
  };
  // Blocking problems go above the list so they are seen after tapping Next;
  // hints (byes, empty courts) stay below it.
  const generalErrors = showErrors ? issues.filter((i) => !i.playerId && i.severity === "error") : [];
  const hints = issues.filter((i) => !i.playerId && i.severity !== "error");

  const addEmpty = () => {
    addPlayers([""]);
    setFocusLast(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold" aria-live="polite">
          {tp("wizard.players.count", players.filter((p) => p.name.trim() !== "").length)}
        </h2>
        <Button variant="secondary" onClick={() => setPasteOpen(true)}>
          <ClipboardDocumentListIcon className="size-5" aria-hidden="true" />
          {t("wizard.players.paste")}
        </Button>
      </div>

      {generalErrors.length > 0 && (
        <div data-invalid tabIndex={-1} className="flex flex-col gap-2 focus:outline-none" aria-live="polite">
          {generalErrors.map((issue) => (
            <Notice key={issue.code} tone="error">
              {issueMessage(issue, translator)}
            </Notice>
          ))}
        </div>
      )}

      {needsGender && <Notice tone="info">{t("wizard.players.genderWhy")}</Notice>}

      {players.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border px-6 py-10 text-center">
          <UserPlusIcon className="size-10 text-primary-soft" aria-hidden="true" />
          <p className="font-bold">{t("wizard.players.emptyTitle")}</p>
          <p className="text-sm text-text-muted">{t("wizard.players.emptyBody")}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {players.map((player, index) => {
            const error = rowError(player.id);
            const label = t("wizard.players.nameLabel", { n: index + 1 });
            const duplicate = player.name.trim() !== "" && duplicates.has(nameKey(player.name));
            return (
              <li key={player.id} className="flex animate-fade-in flex-col gap-1.5 rounded-card bg-surface p-2 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="tabular w-6 shrink-0 text-center text-sm font-semibold text-text-muted">{index + 1}</span>
                  <div className="relative min-w-0 flex-1">
                    <input
                      aria-label={label}
                      aria-invalid={error ? true : undefined}
                      value={player.name}
                      placeholder={t("wizard.players.namePlaceholder")}
                      maxLength={NAME_MAX_LENGTH.player}
                      autoFocus={focusLast && index === players.length - 1}
                      onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                      autoComplete="off"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      className={`min-h-11 w-full rounded-input border bg-bg px-3 text-base focus:outline-none ${
                        error ? "border-danger" : "border-transparent focus:border-primary-soft"
                      }`}
                    />
                  </div>
                  {needsGender && (
                    <div
                      className={`w-[132px] shrink-0 rounded-button ${showErrors && !player.gender ? "ring-2 ring-danger" : ""}`}
                    >
                      <Segmented<Gender>
                        label={t("wizard.players.genderOf", { name: player.name || label })}
                        hideLabel
                        compact
                        value={player.gender ?? null}
                        onChange={(gender) => updatePlayer(player.id, { gender })}
                        options={[
                          { value: "M", label: t("wizard.players.male") },
                          { value: "F", label: t("wizard.players.female") },
                        ]}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePlayer(player.id)}
                    aria-label={
                      player.name.trim()
                        ? t("wizard.players.remove", { name: player.name })
                        : t("wizard.players.removeEmpty", { n: index + 1 })
                    }
                    className="grid size-11 shrink-0 place-items-center rounded-button text-text-muted active:bg-surface-2"
                  >
                    <XMarkIcon className="size-5" aria-hidden="true" />
                  </button>
                </div>
                {duplicate && (
                  <span className="ml-8 self-start rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
                    {t("wizard.players.sameName")}
                  </span>
                )}
                {error && <p className="pl-8 text-sm font-medium text-danger">{error}</p>}
              </li>
            );
          })}
        </ol>
      )}

      <Button variant="secondary" block onClick={addEmpty}>
        <PlusIcon className="size-5" aria-hidden="true" />
        {t("wizard.players.add")}
      </Button>

      {hints.length > 0 && (
        <div className="flex flex-col gap-2" aria-live="polite">
          {hints.map((issue) => (
            <Notice key={issue.code} tone={issue.severity}>
              {issueMessage(issue, translator)}
            </Notice>
          ))}
        </div>
      )}

      <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} onAdd={addPlayers} />
    </div>
  );
}
