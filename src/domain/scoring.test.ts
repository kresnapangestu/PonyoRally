import { describe, expect, it } from "vitest";
import { getMatchStatus, getWinner, inferOtherScore, isRoundResolved, validateScore } from "./scoring";
import type { Match } from "./types";

const match = (extra: Partial<Match> = {}): Match => ({
  court: 0,
  a: { p: ["a1", "a2"] },
  b: { p: ["b1", "b2"] },
  ...extra,
});

const total24 = { scoring: "total", targetPoints: 24 } as const;
const firstTo4 = { scoring: "race", targetPoints: 4 } as const;

describe("validateScore — total", () => {
  it("accepts scores that add up to the total", () => {
    expect(validateScore([14, 10], total24)).toBeNull();
    expect(validateScore([24, 0], total24)).toBeNull();
    expect(validateScore([12, 12], total24)).toBeNull();
  });

  it("rejects non-integers, negatives and over-target values", () => {
    expect(validateScore([13.5, 10.5], total24)).toBe("notInteger");
    expect(validateScore([-1, 25], total24)).toBe("negative");
    expect(validateScore([25, -1], total24)).toBe("exceedsTarget");
  });

  it("rejects scores that do not reach the total", () => {
    expect(validateScore([14, 9], total24)).toBe("wrongTotal");
  });
});

describe("validateScore — first to N", () => {
  it("accepts exactly one side on the target", () => {
    expect(validateScore([4, 2], firstTo4)).toBeNull();
    expect(validateScore([3, 4], firstTo4)).toBeNull();
    expect(validateScore([4, 0], firstTo4)).toBeNull();
  });

  it("rejects no winner, two winners and going past the target", () => {
    expect(validateScore([3, 2], firstTo4)).toBe("noWinner");
    expect(validateScore([4, 4], firstTo4)).toBe("bothReachedTarget");
    expect(validateScore([5, 2], firstTo4)).toBe("exceedsTarget");
  });
});

describe("inferOtherScore", () => {
  it("fills the remainder for a fixed total", () => {
    expect(inferOtherScore(14, total24)).toBe(10);
    expect(inferOtherScore(0, total24)).toBe(24);
  });

  it("gives the target to the other side when one side fell short", () => {
    expect(inferOtherScore(2, firstTo4)).toBe(4);
  });

  it("cannot guess the loser's score from the winner's", () => {
    expect(inferOtherScore(4, firstTo4)).toBeNull();
  });
});

describe("match status and winner", () => {
  it("is pending without a score", () => {
    expect(getMatchStatus(match())).toBe("pending");
    expect(getWinner(match())).toBeNull();
  });

  it("is complete with a score", () => {
    expect(getMatchStatus(match({ s: [14, 10] }))).toBe("complete");
    expect(getWinner(match({ s: [14, 10] }))).toBe(0);
    expect(getWinner(match({ s: [9, 15] }))).toBe(1);
    expect(getWinner(match({ s: [12, 12] }))).toBe("draw");
  });

  it("is skipped and has no winner when skipped", () => {
    expect(getMatchStatus(match({ skipped: true }))).toBe("skipped");
    expect(getWinner(match({ skipped: true }))).toBeNull();
  });

  it("resolves a round only when no match is pending", () => {
    expect(isRoundResolved([match({ s: [14, 10] }), match({ skipped: true })])).toBe(true);
    expect(isRoundResolved([match({ s: [14, 10] }), match()])).toBe(false);
  });
});
