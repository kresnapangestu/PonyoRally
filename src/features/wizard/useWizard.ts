"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ROUTES } from "@/constants/routes";
import type { InfeasibleReason } from "@/domain/engine";
import { hasBlockingIssues, validateSetup, type SetupIssue } from "@/domain/validation/setup";
import { useT } from "@/i18n/useT";
import { toSetupDraft } from "@/store/draft";
import { useDraftStore } from "@/store/draft-store";
import { useTournamentStore } from "@/store/tournament-store";
import { STEP_FIELDS, stepForField, stepsFor, type WizardStep } from "./steps";

/** After a failed "Next", move focus to the first field that needs fixing. */
function focusFirstInvalid() {
  requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
    field?.focus();
    field?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0 });
}

/**
 * Wizard flow: which step is showing, which issues belong to it, and what
 * Next / Back / Create do. Errors stay hidden until the host first tries to
 * move past a step, so a fresh form is not covered in red.
 */
export function useWizard() {
  const router = useRouter();
  const { t } = useT();
  const draft = useDraftStore();
  const createTournament = useTournamentStore((s) => s.create);

  const [attempted, setAttempted] = useState<ReadonlySet<WizardStep>>(new Set());
  const [createError, setCreateError] = useState<InfeasibleReason | null>(null);

  const steps = stepsFor(draft.format);
  const stepIndex = Math.min(draft.step, steps.length - 1);
  const step = steps[stepIndex];

  const setup = useMemo(
    () => toSetupDraft(draft, (i) => t("wizard.details.courtDefault", { n: i + 1 })),
    [draft, t],
  );
  const issues = useMemo(() => validateSetup(setup), [setup]);

  const issuesOf = (target: WizardStep): SetupIssue[] =>
    target === "review" ? issues : issues.filter((issue) => STEP_FIELDS[target].includes(issue.field));

  const markAttempted = (targets: WizardStep[]) => setAttempted((prev) => new Set([...prev, ...targets]));

  function goTo(target: WizardStep) {
    const index = steps.indexOf(target);
    if (index === -1) return;
    draft.setStep(index);
    setCreateError(null);
    scrollToTop();
  }

  function create() {
    markAttempted(steps);
    if (hasBlockingIssues(issues)) {
      const firstError = issues.find((issue) => issue.severity === "error")!;
      goTo(stepForField(firstError.field));
      focusFirstInvalid();
      return;
    }

    const result = createTournament(setup);
    if (!result.ok) {
      if (result.error !== "invalidSetup") setCreateError(result.error);
      return;
    }
    draft.reset();
    router.replace(ROUTES.tournament(result.tournament.id));
  }

  function next() {
    if (step === "review") return create();
    if (hasBlockingIssues(issuesOf(step))) {
      markAttempted([step]);
      focusFirstInvalid();
      return;
    }
    draft.setStep(stepIndex + 1);
    scrollToTop();
  }

  function back() {
    if (stepIndex === 0) return router.push(ROUTES.home);
    draft.setStep(stepIndex - 1);
    scrollToTop();
  }

  return {
    steps,
    step,
    stepIndex,
    issues: issuesOf(step),
    allIssues: issues,
    showErrors: attempted.has(step),
    createError,
    goTo,
    next,
    back,
    startOver: () => {
      draft.reset();
      setAttempted(new Set());
      setCreateError(null);
    },
  };
}
