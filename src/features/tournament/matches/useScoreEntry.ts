"use client";

import { useState } from "react";
import { inferOtherScore, validateScore, type ScoringRule } from "@/domain/scoring";
import type { Score } from "@/domain/types";

type SideIndex = 0 | 1;
type Values = [string, string];
type Flags = [boolean, boolean];

const other = (side: SideIndex): SideIndex => (side === 0 ? 1 : 0);

/**
 * Keypad state for one match.
 *  - The other side fills itself in whenever the rule makes it certain
 *    (total 24: 14 → 10; first to 4: 2 → 4), until the host types into it.
 *  - The first digit after picking a side replaces what was there, so
 *    correcting 14–10 to 20–4 is just "2", "0".
 */
export function useScoreEntry(initial: Score | undefined, rule: ScoringRule, startSide: SideIndex) {
  const [values, setValues] = useState<Values>(initial ? [String(initial[0]), String(initial[1])] : ["", ""]);
  // Typed by hand in this session (so not overwritten by inference).
  const [typed, setTyped] = useState<Flags>([false, false]);
  // The next digit replaces the value instead of appending to it.
  const [fresh, setFresh] = useState<Flags>([true, true]);
  const [active, setActiveSide] = useState<SideIndex>(startSide);

  function update(side: SideIndex, value: string) {
    const next: Values = [...values];
    next[side] = value;

    const otherSide = other(side);
    if (!typed[otherSide]) {
      const inferred = value === "" ? null : inferOtherScore(Number(value), rule);
      next[otherSide] = inferred === null ? "" : String(inferred);
    }
    const nextTyped: Flags = [...typed];
    nextTyped[side] = value !== "";
    const nextFresh: Flags = [...fresh];
    nextFresh[side] = false;

    setValues(next);
    setTyped(nextTyped);
    setFresh(nextFresh);

    // First to N: the winner's score says nothing about the loser's, so move on to it.
    if (rule.scoring === "race" && Number(value) === rule.targetPoints && !typed[otherSide]) {
      setActive(otherSide);
    }
  }

  function setActive(side: SideIndex) {
    setActiveSide(side);
    setFresh((current) => {
      const next: Flags = [...current];
      next[side] = true;
      return next;
    });
  }

  function press(digit: number) {
    const current = fresh[active] ? "" : values[active];
    let next = current === "0" ? String(digit) : current + digit;
    if (Number(next) > rule.targetPoints) next = String(digit);
    if (Number(next) > rule.targetPoints) return;
    update(active, next);
  }

  function backspace() {
    update(active, fresh[active] ? "" : values[active].slice(0, -1));
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
