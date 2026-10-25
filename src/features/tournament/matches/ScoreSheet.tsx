"use client";

import { BackspaceIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Match, Score, ScoringMode } from "@/domain/types";
import { useT } from "@/i18n/useT";
import type { Names } from "../view-model";
import { useScoreEntry } from "./useScoreEntry";

interface ScoreSheetProps {
  match: Match;
  gameNumber: number;
  rule: { scoring: ScoringMode; targetPoints: number };
  names: Names;
  startSide: 0 | 1;
  onSave: (score: Score) => void;
  onClose: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Big keypad so scores can be entered with a thumb, standing courtside. */
export function ScoreSheet({ match, gameNumber, rule, names, startSide, onSave, onClose }: ScoreSheetProps) {
  const { t } = useT();
  const entry = useScoreEntry(match.s, rule, startSide);
  const n = rule.targetPoints;

  const save = () => {
    if (entry.score && entry.canSave) onSave(entry.score);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("tournament.score.title", { n: gameNumber })}
      closeLabel={t("common.close")}
      footer={
        <Button size="lg" block disabled={!entry.canSave} onClick={save}>
          {t("tournament.score.save")}
        </Button>
      }
    >
      <div
        className="flex flex-col gap-4"
        onKeyDown={(e) => {
          if (/^\d$/.test(e.key)) entry.press(Number(e.key));
          else if (e.key === "Backspace") entry.backspace();
          else if (e.key === "Enter") save();
          else return;
          e.preventDefault();
        }}
      >
        <p className="text-sm text-text-muted">
          {t(rule.scoring === "race" ? "tournament.score.hintRace" : "tournament.score.hintTotal", { n })}
        </p>

        <div className="grid grid-cols-2 gap-3" role="group">
          {([0, 1] as const).map((side) => {
            const name = names.side(side === 0 ? match.a : match.b);
            const isActive = entry.active === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => entry.setActive(side)}
                autoFocus={side === startSide}
                aria-pressed={isActive}
                aria-label={t("tournament.score.editSide", { name })}
                className={`flex min-h-32 flex-col items-center justify-between gap-2 rounded-card border-2 p-3 transition-colors duration-120 ${
                  isActive ? "border-primary bg-surface" : "border-border bg-surface-2"
                }`}
              >
                <span className="line-clamp-2 text-center text-sm font-semibold">{name}</span>
                <span
                  key={entry.values[side]}
                  className={`tabular animate-pop-in text-5xl leading-none font-extrabold ${
                    entry.values[side] === "" ? "text-text-muted/40" : ""
                  }`}
                >
                  {entry.values[side] === "" ? "–" : entry.values[side]}
                </span>
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="min-h-5 text-center text-sm font-medium text-danger">
          {entry.error ? t(`tournament.score.errors.${entry.error}`, { n }) : ""}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {DIGITS.map((digit) => (
            <KeypadKey key={digit} onPress={() => entry.press(digit)}>
              {digit}
            </KeypadKey>
          ))}
          <KeypadKey onPress={entry.backspace} label={t("tournament.score.backspace")}>
            <BackspaceIcon className="size-7" aria-hidden="true" />
          </KeypadKey>
          <KeypadKey onPress={() => entry.press(0)}>0</KeypadKey>
        </div>
      </div>
    </Sheet>
  );
}

function KeypadKey({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className="tabular grid min-h-16 place-items-center rounded-button bg-surface-2 text-2xl font-bold transition-transform duration-120 select-none active:scale-95 active:bg-border"
    >
      {children}
    </button>
  );
}
