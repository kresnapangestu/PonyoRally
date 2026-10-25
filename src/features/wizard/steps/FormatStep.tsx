"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import type { SetupIssue } from "@/domain/validation/setup";
import { useT } from "@/i18n/useT";
import { useDraftStore } from "@/store/draft-store";
import { FORMAT_ICONS, FORMAT_ORDER, formatBadges } from "../format-meta";
import { issueMessage } from "../issue-message";

export function FormatStep({ issues, showErrors }: { issues: SetupIssue[]; showErrors: boolean }) {
  const translator = useT();
  const { t } = translator;
  const format = useDraftStore((s) => s.format);
  const setFormat = useDraftStore((s) => s.setFormat);
  const [compareOpen, setCompareOpen] = useState(false);
  const error = showErrors ? issues.find((i) => i.severity === "error") : undefined;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div data-invalid tabIndex={-1} className="rounded-card focus:outline-none">
          <Notice tone="error">{issueMessage(error, translator)}</Notice>
        </div>
      )}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{t("wizard.steps.format")}</legend>
        {FORMAT_ORDER.map((id) => {
          const Icon = FORMAT_ICONS[id];
          return (
            <label
              key={id}
              className="relative flex cursor-pointer select-none items-start gap-3 rounded-card border-2 border-border bg-surface p-4 shadow-card transition-[border-color,transform] duration-120 active:scale-[0.99] has-checked:border-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="format"
                value={id}
                checked={format === id}
                onChange={() => setFormat(id)}
                className="peer sr-only"
              />
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-primary-soft">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-base font-bold">{t(`formats.${id}.name`)}</span>
                <span className="text-sm text-text-muted">{t(`formats.${id}.short`)}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {formatBadges(id).map((badge) => (
                    <span key={badge} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-primary-soft">
                      {t(badge)}
                    </span>
                  ))}
                </span>
              </span>
              <CheckCircleIcon
                className="size-6 shrink-0 text-primary opacity-0 transition-opacity duration-120 peer-checked:animate-pop-in peer-checked:opacity-100"
                aria-hidden="true"
              />
            </label>
          );
        })}
      </fieldset>

      <Button variant="ghost" onClick={() => setCompareOpen(true)} className="self-center">
        <QuestionMarkCircleIcon className="size-5" aria-hidden="true" />
        {t("wizard.format.whatsDifferent")}
      </Button>

      <Sheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title={t("wizard.format.compareTitle")}
        closeLabel={t("common.close")}
      >
        <dl className="flex flex-col gap-4">
          {FORMAT_ORDER.map((id) => (
            <div key={id}>
              <dt className="font-bold">{t(`formats.${id}.name`)}</dt>
              <dd className="text-sm text-text-muted">{t(`formats.${id}.long`)}</dd>
            </div>
          ))}
        </dl>
      </Sheet>
    </div>
  );
}
