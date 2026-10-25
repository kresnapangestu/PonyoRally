"use client";

import { useState } from "react";
import { inferOtherScore, validateScore, type ScoringRule } from "@/domain/scoring";
import type { Score } from "@/domain/types";

type SideIndex = 0 | 1;
type Values = [string, string];

const other = (side: SideIndex): SideIndex => (side === 0 ? 1 : 0);

/**
 * Keypad state for one match. The host types into the active side; the
 * other side fills itself in whenever the rule makes it certain (total 24:
 * 14 → 10; first to 4: 2 → 4) until the host types into it directly.
 */
export function useScoreEntry(initial: Score | undefined, rule: ScoringRule, startSide: SideIndex) {
  const [values, setValues] = useState<Values>(initial ? [String(initial[0]), String(initial[1])] : ["", ""]);
  const [typed, setTyped] = useState<[boolean, boolean]>([Boolean(initial), Boolean(initial)]);
  const [active, setActive] = useState<SideIndex>(startSide);

  function update(side: SideIndex, value: string) {
    const next: Values = [...values];
    next[side] = value;

    const otherSide = other(side);
    if (!typed[otherSide]) {
      const inferred = value === "" ? null : inferOtherScore(Number(value), rule);
      next[otherSide] = inferred === null ? "" : String(inferred);
    }
    const nextTyped: [boolean, boolean] = [...typed];
    nextTyped[side] = value !== "";
    setTyped(nextTyped);
    setValues(next);

    // First to N: the winner's score says nothing about the loser's, so move on to it.
    if (rule.scoring === "race" && Number(value) === rule.targetPoints && !typed[otherSide]) setActive(otherSide);
  }

  function press(digit: number) {
    const current = values[active];
    let next = current === "0" ? String(digit) : current + digit;
    if (Number(next) > rule.targetPoints) next = String(digit);
    if (Number(next) > rule.targetPoints) return;
    update(active, next);
  }

  function backspace() {
    update(active, values[active].slice(0, -1));
  }

  const score: Score | null = values[0] !== "" && values[1] !== "" ? [Number(values[0]), Number(values[1])] : null;
  const error = score ? validateScore(score, rule) : null;

  return {
    values,
    active,
    setActive,
    press,
    backspace,
    score,
    error,
    canSave: score !== null && error === null,
  };
}
