"use client";

import { Segmented } from "@/components/ui/Segmented";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { FORMAT_RULES } from "@/constants/formats";
import { COURTS, NAME_MAX_LENGTH, TARGET_POINTS } from "@/constants/limits";
import type { PlayMode, ScoringMode } from "@/domain/types";
import type { SetupIssue } from "@/domain/validation/setup";
import { useT } from "@/i18n/useT";
import { useDraftStore } from "@/store/draft-store";
import { issueMessage } from "../issue-message";

/** Example scores for the helper text: first to 4 → 4–2, total 24 → 14–10. */
function raceExample(target: number) {
  return Math.max(0, Math.floor(target / 2));
}
function totalExample(target: number) {
  const a = Math.ceil(target * 0.58);
  return { a, b: target - a };
}

/** Digits only, so a stray letter or minus never reaches the draft. */
function parsePoints(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

export function DetailsStep({ issues, showErrors }: { issues: SetupIssue[]; showErrors: boolean }) {
  const translator = useT();
  const { t } = translator;
  const draft = useDraftStore();
  const supportsSingles = draft.format ? FORMAT_RULES[draft.format].supportsSingles : true;

  const errorFor = (field: SetupIssue["field"], courtIndex?: number) => {
    if (!showErrors) return undefined;
    const issue = issues.find(
      (i) => i.severity === "error" && i.field === field && (courtIndex === undefined || i.courtIndex === courtIndex),
    );
    return issue && issueMessage(issue, translator);
  };

  const target = draft.targetPoints;
  const race = draft.scoring === "race";
  const help = !target
    ? t(race ? "wizard.details.helpRaceEmpty" : "wizard.details.helpTotalEmpty")
    : race
      ? t("wizard.details.helpRace", { target, other: raceExample(target) })
      : t("wizard.details.helpTotal", { target, ...totalExample(target) });

  return (
    <div className="flex flex-col gap-6">
      <TextField
        label={t("wizard.details.nameLabel")}
        placeholder={t("wizard.details.namePlaceholder")}
        value={draft.name}
        maxLength={NAME_MAX_LENGTH.game}
        onChange={(e) => draft.setName(e.target.value)}
        error={errorFor("name")}
        enterKeyHint="next"
        autoComplete="off"
      />

      <div className="flex flex-col gap-1.5">
        <Segmented<PlayMode>
          label={t("wizard.details.modeLabel")}
          value={draft.mode}
          onChange={draft.setMode}
          options={[
            { value: "doubles", label: t("wizard.details.doubles") },
            { value: "singles", label: t("wizard.details.singles"), disabled: !supportsSingles },
          ]}
        />
        {!supportsSingles && <p className="text-sm text-text-muted">{t("wizard.details.singlesUnavailable")}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Stepper
          label={t("wizard.details.courtsLabel")}
          value={draft.courtCount}
          min={COURTS.min}
          max={COURTS.max}
          onChange={draft.setCourtCount}
          decreaseLabel={t("wizard.details.decrease")}
          increaseLabel={t("wizard.details.increase")}
        />
        <details className="group rounded-card border border-border bg-surface open:pb-3">
          <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold text-primary-soft">
            {t("wizard.details.editCourtNames")}
          </summary>
          <div className="flex flex-col gap-3 px-4">
            {Array.from({ length: draft.courtCount }, (_, i) => (
              <TextField
                key={i}
                label={t("wizard.details.courtNameLabel", { n: i + 1 })}
                placeholder={t("wizard.details.courtDefault", { n: i + 1 })}
                value={draft.courtNameOverrides[i] ?? ""}
                maxLength={NAME_MAX_LENGTH.court}
                onChange={(e) => draft.setCourtName(i, e.target.value)}
                error={errorFor("courts", i)}
                autoComplete="off"
              />
            ))}
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-3">
        <Segmented<ScoringMode>
          label={t("wizard.details.scoringLabel")}
          value={draft.scoring}
          onChange={draft.setScoring}
          options={[
            { value: "race", label: t("wizard.details.scoringRace") },
            { value: "total", label: t("wizard.details.scoringTotal") },
          ]}
        />
        <TextField
          label={t(race ? "wizard.details.pointsRace" : "wizard.details.pointsTotal")}
          placeholder={t(race ? "wizard.details.placeholderRace" : "wizard.details.placeholderTotal")}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={String(TARGET_POINTS.max).length}
          value={target === null ? "" : String(target)}
          onChange={(e) => draft.setTargetPoints(parsePoints(e.target.value))}
          error={errorFor("points")}
          hint={help}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
