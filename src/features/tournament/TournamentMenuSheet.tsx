"use client";

import { ArrowDownTrayIcon, ArrowPathIcon, FlagIcon, LockOpenIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { getMatchStatus } from "@/domain/scoring";
import { useT } from "@/i18n/useT";
import { MenuItem } from "./matches/MatchMenuSheet";
import type { TournamentScreenModel } from "./useTournamentScreen";

type Confirm = "finish" | "delete" | null;

export function TournamentMenuSheet({ model }: { model: TournamentScreenModel }) {
  const { t } = useT();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const latest = model.tournament.rounds[model.latestRound];
  const canRedo = latest.matches.every((m) => getMatchStatus(m) === "pending" && !m.subs?.length);

  if (confirm) {
    const isDelete = confirm === "delete";
    return (
      <Sheet
        open
        onClose={model.closeSheet}
        title={t(isDelete ? "tournament.menu.deleteTitle" : "tournament.menu.finishTitle")}
        closeLabel={t("common.close")}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant={isDelete ? "danger" : "primary"} block onClick={isDelete ? model.deleteTournament : model.finish}>
              {t(isDelete ? "tournament.menu.deleteConfirm" : "tournament.menu.finish")}
            </Button>
          </div>
        }
      >
        <p className="text-text-muted">
          {isDelete
            ? t("tournament.menu.deleteBody", { name: model.tournament.name })
            : t("tournament.menu.finishBody")}
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={model.closeSheet} title={t("tournament.menu.title")} closeLabel={t("common.close")}>
      <ul className="flex flex-col gap-1">
        {!model.finished && (
          <MenuItem
            icon={ArrowPathIcon}
            label={t("tournament.menu.redo", { n: model.latestRound + 1 })}
            hint={t("tournament.menu.redoHint")}
            onClick={model.redo}
            disabled={!canRedo}
          />
        )}
        {model.finished ? (
          <MenuItem icon={LockOpenIcon} label={t("tournament.menu.reopen")} onClick={model.reopen} />
        ) : (
          <MenuItem icon={FlagIcon} label={t("tournament.menu.finish")} onClick={() => setConfirm("finish")} />
        )}
        <MenuItem icon={ArrowDownTrayIcon} label={t("tournament.menu.exportOne")} onClick={model.exportOne} />
        <MenuItem icon={TrashIcon} label={t("tournament.menu.delete")} onClick={() => setConfirm("delete")} danger />
      </ul>
    </Sheet>
  );
}
