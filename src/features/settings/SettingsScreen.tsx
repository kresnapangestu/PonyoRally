"use client";

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { TopBar } from "@/components/ui/TopBar";
import type { Language } from "@/i18n/languages";
import { useT } from "@/i18n/useT";
import { usePrefsStore } from "@/store/prefs-store";
import type { ThemePreference } from "@/theme/theme";
import { useDataManagement } from "./useDataManagement";

export function SettingsScreen() {
  const { t, tp } = useT();
  const { lang, theme, setLang, setTheme } = usePrefsStore();
  const data = useDataManagement();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportEmpty, setExportEmpty] = useState(false);
  // "Replace all" deletes other tournaments, so it takes a second tap.
  const [confirmReplace, setConfirmReplace] = useState(false);

  return (
    <>
      <TopBar title={t("settings.title")} backLabel={t("common.back")} />
      <main className="flex flex-1 flex-col gap-6 px-4 pt-2 pb-6">
        <Segmented<Language>
          label={t("settings.language")}
          value={lang}
          onChange={setLang}
          options={[
            { value: "id", label: "Bahasa Indonesia" },
            { value: "en", label: "English" },
          ]}
        />
        <Segmented<ThemePreference>
          label={t("settings.theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("settings.themeSystem") },
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ]}
        />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t("settings.data")}</h2>

          {data.corrupt.map((id) => (
            <div key={id} className="flex flex-col gap-2 rounded-card border border-warning/40 bg-warning/10 p-3">
              <p className="flex items-center gap-2 font-semibold">
                <ExclamationTriangleIcon className="size-5 text-warning" aria-hidden="true" />
                {t("settings.corruptTitle")}
              </p>
              <p className="text-sm text-text-muted">{t("settings.corruptBody")}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => data.downloadCorrupt(id)}>
                  {t("settings.download")}
                </Button>
                <Button variant="ghost" onClick={() => data.discardCorrupt(id)}>
                  {t("settings.discard")}
                </Button>
              </div>
            </div>
          ))}

          <div className="divide-y divide-border overflow-hidden rounded-card bg-surface shadow-card">
            <ActionRow
              icon={ArrowDownTrayIcon}
              title={t("settings.exportAll")}
              hint={t("settings.exportHint")}
              onClick={() => setExportEmpty(!data.exportAll())}
            />
            <ActionRow
              icon={ArrowUpTrayIcon}
              title={t("settings.importFile")}
              hint={t("settings.importHint")}
              onClick={() => fileInput.current?.click()}
            />
            <ActionRow
              icon={TrashIcon}
              title={t("settings.reset")}
              hint={t("settings.resetHint")}
              onClick={() => setConfirmReset(true)}
              danger
            />
          </div>
          {exportEmpty && <Notice tone="info">{t("settings.nothingToExport")}</Notice>}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void data.readFile(file);
            }}
          />
        </section>

        <p className="flex items-start gap-2 text-sm text-text-muted">
          <InformationCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("settings.localNote")}
        </p>
      </main>

      {data.importState.stage !== "idle" && (
        <Sheet
          open
          onClose={() => {
            setConfirmReplace(false);
            data.closeImport();
          }}
          title={t("settings.importTitle")} closeLabel={t("common.close")}>
          {data.importState.stage === "error" ? (
            <Notice tone="error">{t(`settings.importErrors.${data.importState.error}`)}</Notice>
          ) : (
            <div className="flex flex-col gap-3">
              <p>{tp("settings.importSummary", data.importState.plan.total)}</p>
              {data.importState.plan.conflicts.length > 0 && (
                <p className="text-sm text-text-muted">{tp("settings.importConflicts", data.importState.plan.conflicts.length)}</p>
              )}
              <Button size="lg" block onClick={() => data.confirmImport("merge")}>
                {t("settings.importMerge")}
              </Button>
              {data.importState.plan.conflicts.length > 0 && (
                <Button size="lg" block variant="secondary" onClick={() => data.confirmImport("mergeReplace")}>
                  {t("settings.importMergeReplace")}
                </Button>
              )}
              {data.tournamentCount > 0 && (
                <>
                  <Button
                    size="lg"
                    block
                    variant={confirmReplace ? "danger" : "ghost"}
                    className={confirmReplace ? "" : "!text-danger"}
                    onClick={() => (confirmReplace ? data.confirmImport("replaceAll") : setConfirmReplace(true))}
                  >
                    {t(confirmReplace ? "settings.importReplaceAllConfirm" : "settings.importReplaceAll")}
                  </Button>
                  <p className="-mt-2 text-center text-xs text-text-muted">{t("settings.importReplaceAllHint")}</p>
                </>
              )}
            </div>
          )}
        </Sheet>
      )}

      {confirmReset && (
        <Sheet
          open
          onClose={() => setConfirmReset(false)}
          title={t("settings.resetTitle")}
          closeLabel={t("common.close")}
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setConfirmReset(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="danger" block onClick={data.resetAll}>
                {t("settings.resetConfirm")}
              </Button>
            </div>
          }
        >
          <p className="text-text-muted">{t("settings.resetBody")}</p>
        </Sheet>
      )}
    </>
  );
}

function ActionRow({
  icon: Icon,
  title,
  hint,
  onClick,
  danger,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  hint: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-surface-2">
      <Icon className={`mt-0.5 size-6 shrink-0 ${danger ? "text-danger" : "text-primary-soft"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${danger ? "text-danger" : ""}`}>{title}</span>
        <span className="block text-sm text-text-muted">{hint}</span>
      </span>
    </button>
  );
}
