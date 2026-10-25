"use client";

import { ArrowPathRoundedSquareIcon, ArrowUturnLeftIcon, ForwardIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { getMatchStatus } from "@/domain/scoring";
import type { Match } from "@/domain/types";
import { useT } from "@/i18n/useT";

interface MatchMenuSheetProps {
  match: Match;
  gameNumber: number;
  onSubstitute: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onClearScore: () => void;
  onClose: () => void;
}

export function MatchMenuSheet({ match, gameNumber, onSubstitute, onSkip, onUnskip, onClearScore, onClose }: MatchMenuSheetProps) {
  const { t } = useT();
  const status = getMatchStatus(match);

  return (
    <Sheet open onClose={onClose} title={t("tournament.game", { n: gameNumber })} closeLabel={t("common.close")}>
      <ul className="flex flex-col gap-1">
        <MenuItem icon={ArrowPathRoundedSquareIcon} label={t("tournament.match.substitute")} onClick={onSubstitute} />
        {status === "pending" && <MenuItem icon={ForwardIcon} label={t("tournament.match.skip")} onClick={onSkip} />}
        {status === "skipped" && <MenuItem icon={ArrowUturnLeftIcon} label={t("tournament.match.unskip")} onClick={onUnskip} />}
        {status === "complete" && (
          <MenuItem icon={TrashIcon} label={t("tournament.match.clearScore")} onClick={onClearScore} danger />
        )}
      </ul>
    </Sheet>
  );
}

export function MenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  disabled,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex min-h-14 w-full items-center gap-3 rounded-button px-3 text-left font-semibold active:bg-surface-2 disabled:opacity-40 ${
          danger ? "text-danger" : ""
        }`}
      >
        <Icon className="size-6 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          {label}
          {hint && <span className="block text-sm font-normal text-text-muted">{hint}</span>}
        </span>
      </button>
    </li>
  );
}
