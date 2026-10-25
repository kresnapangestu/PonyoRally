"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TopBar } from "@/components/ui/TopBar";
import { useT } from "@/i18n/useT";
import { hasDraftContent } from "@/store/draft";
import { useDraftStore } from "@/store/draft-store";
import { DetailsStep } from "./steps/DetailsStep";
import { FormatStep } from "./steps/FormatStep";
import { PlayersStep } from "./steps/PlayersStep";
import { ReviewStep } from "./steps/ReviewStep";
import { TeamsStep } from "./steps/TeamsStep";
import { useWizard } from "./useWizard";

export function WizardScreen() {
  const { t } = useT();
  const wizard = useWizard();
  const canStartOver = useDraftStore(hasDraftContent);
  const [confirmStartOver, setConfirmStartOver] = useState(false);

  const total = wizard.steps.length;
  const stepProps = { issues: wizard.issues, showErrors: wizard.showErrors };

  return (
    <>
      <TopBar
        title={t(`wizard.steps.${wizard.step}`)}
        subtitle={`${t("wizard.title")} · ${t("wizard.stepOf", { current: wizard.stepIndex + 1, total })}`}
        onBack={wizard.back}
        backLabel={t("common.back")}
        actions={
          canStartOver && (
            <button
              type="button"
              onClick={() => setConfirmStartOver(true)}
              aria-label={t("wizard.startOver")}
              className="grid size-12 place-items-center rounded-button text-text-muted active:bg-surface-2"
            >
              <ArrowPathIcon className="size-5" aria-hidden="true" />
            </button>
          )
        }
      />
      <div
        className="mx-4 h-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={wizard.stepIndex + 1}
        aria-label={t("wizard.stepOf", { current: wizard.stepIndex + 1, total })}
      >
        <div
          className="h-full rounded-full bg-primary-soft transition-[width] duration-320 ease-standard"
          style={{ width: `${((wizard.stepIndex + 1) / total) * 100}%` }}
        />
      </div>

      <main key={wizard.step} className="flex-1 animate-step-in px-4 pt-5 pb-8">
        {wizard.step === "format" && <FormatStep {...stepProps} />}
        {wizard.step === "details" && <DetailsStep {...stepProps} />}
        {wizard.step === "players" && <PlayersStep {...stepProps} />}
        {wizard.step === "teams" && <TeamsStep {...stepProps} />}
        {wizard.step === "review" && (
          <ReviewStep issues={wizard.allIssues} createError={wizard.createError} onEdit={wizard.goTo} />
        )}
      </main>

      <BottomBar>
        <Button size="lg" block onClick={wizard.next}>
          {wizard.step === "review" ? t("wizard.create") : t("wizard.next")}
        </Button>
      </BottomBar>

      <Sheet
        open={confirmStartOver}
        onClose={() => setConfirmStartOver(false)}
        title={t("wizard.startOverTitle")}
        closeLabel={t("common.close")}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setConfirmStartOver(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => {
                wizard.startOver();
                setConfirmStartOver(false);
              }}
            >
              {t("wizard.startOverConfirm")}
            </Button>
          </div>
        }
      >
        <p className="text-text-muted">{t("wizard.startOverBody")}</p>
      </Sheet>
    </>
  );
}
