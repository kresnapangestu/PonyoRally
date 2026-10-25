"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui/Notice";
import { FORMAT_RULES } from "@/constants/formats";
import type { InfeasibleReason } from "@/domain/engine";
import type { SetupIssue } from "@/domain/validation/setup";
import { useT } from "@/i18n/useT";
import { resolveCourtNames } from "@/store/draft";
import { useDraftStore } from "@/store/draft-store";
import { issueMessage } from "../issue-message";
import { stepForField, type WizardStep } from "../steps";

interface ReviewStepProps {
  issues: SetupIssue[];
  createError: InfeasibleReason | null;
  onEdit: (step: WizardStep) => void;
}

function Row({ label, value, onEdit, editLabel }: { label: string; value: ReactNode; onEdit: () => void; editLabel: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <dt className="w-24 shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 font-semibold">{value}</dd>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${editLabel} ${label}`}
        className="-my-2 min-h-11 shrink-0 rounded-button px-3 text-sm font-semibold text-primary-soft active:bg-surface-2"
      >
        {editLabel}
      </button>
    </div>
  );
}

export function ReviewStep({ issues, createError, onEdit }: ReviewStepProps) {
  const translator = useT();
  const { t, tp } = translator;
  const draft = useDraftStore();
  const rules = draft.format ? FORMAT_RULES[draft.format] : null;
  const courts = resolveCourtNames(draft, (i) => t("wizard.details.courtDefault", { n: i + 1 }));
  const errors = issues.filter((i) => i.severity === "error");
  const others = issues.filter((i) => i.severity !== "error");
  const edit = t("common.edit");

  return (
    <div className="flex flex-col gap-5">
      <dl className="divide-y divide-border rounded-card bg-surface px-4 shadow-card">
        <Row
          label={t("wizard.review.format")}
          value={draft.format ? t(`formats.${draft.format}.name`) : "—"}
          onEdit={() => onEdit("format")}
          editLabel={edit}
        />
        <Row
          label={t("wizard.details.nameLabel")}
          value={draft.name.trim() || "—"}
          onEdit={() => onEdit("details")}
          editLabel={edit}
        />
        <Row
          label={t("wizard.review.mode")}
          value={t(draft.mode === "doubles" ? "wizard.details.doubles" : "wizard.details.singles")}
          onEdit={() => onEdit("details")}
          editLabel={edit}
        />
        <Row
          label={t("wizard.review.courts")}
          value={courts.join(", ")}
          onEdit={() => onEdit("details")}
          editLabel={edit}
        />
        <Row
          label={t("wizard.review.scoring")}
          value={
            draft.targetPoints === null
              ? "—"
              : t(draft.scoring === "race" ? "wizard.review.scoringRaceValue" : "wizard.review.scoringTotalValue", {
                  n: draft.targetPoints,
                })
          }
          onEdit={() => onEdit("details")}
          editLabel={edit}
        />
        <Row
          label={t("wizard.review.players")}
          value={tp("wizard.players.count", draft.players.length)}
          onEdit={() => onEdit("players")}
          editLabel={edit}
        />
        {rules?.fixedTeams && (
          <Row
            label={t("wizard.review.teams")}
            value={tp("wizard.review.teamsCount", draft.teams.length)}
            onEdit={() => onEdit("teams")}
            editLabel={edit}
          />
        )}
      </dl>

      <div className="flex flex-col gap-2" aria-live="polite">
        {errors.map((issue, i) => (
          <Notice
            key={`${issue.code}-${i}`}
            tone="error"
            action={
              <button
                type="button"
                onClick={() => onEdit(stepForField(issue.field))}
                className="-my-2 min-h-11 shrink-0 rounded-button px-2 text-sm font-semibold text-primary-soft"
              >
                {t("wizard.review.fix")}
              </button>
            }
          >
            {issueMessage(issue, translator)}
          </Notice>
        ))}
        {others.map((issue) => (
          <Notice key={issue.code} tone={issue.severity}>
            {issueMessage(issue, translator)}
          </Notice>
        ))}
        {createError && (
          <Notice tone="error">{t("wizard.review.createFailed", { reason: t(`engine.${createError}`) })}</Notice>
        )}
        {errors.length === 0 && !createError && (
          <p className="flex items-center gap-2 text-sm font-semibold text-primary-soft">
            <CheckCircleIcon className="size-5 shrink-0 text-success" aria-hidden="true" />
            {t("wizard.review.ready")}
          </p>
        )}
      </div>
    </div>
  );
}
