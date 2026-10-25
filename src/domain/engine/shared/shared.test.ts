import { describe, expect, it } from "vitest";
import { circleRound } from "./circle";
import { pairKey } from "./history";
import { createRng, hashSeed, shuffle } from "./rng";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe("rng", () => {
  it("is reproducible for the same seed", () => {
    const a = createRng(hashSeed(42, 3, 0));
    const b = createRng(hashSeed(42, 3, 0));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("changes with the round or attempt", () => {
    expect(hashSeed(42, 3, 0)).not.toBe(hashSeed(42, 3, 1));
    expect(hashSeed(42, 3, 0)).not.toBe(hashSeed(42, 4, 0));
  });

  it("shuffles into a permutation without mutating the input", () => {
    const input = ids(10);
    const result = shuffle(input, createRng(7));
    expect([...result].sort()).toEqual([...input].sort());
    expect(input).toEqual(ids(10));
  });
});

describe("circleRound", () => {
  it.each([4, 8, 12])("pairs every entry with every other exactly once (%i entries)", (n) => {
    const seen = new Map<string, number>();
    for (let r = 0; r < n - 1; r++) {
      const { pairs, resting } = circleRound(ids(n), r);
      expect(resting).toBeNull();
      expect(pairs).toHaveLength(n / 2);
      for (const [a, b] of pairs) seen.set(pairKey(a, b), (seen.get(pairKey(a, b)) ?? 0) + 1);
    }
    expect(seen.size).toBe((n * (n - 1)) / 2);
    expect([...seen.values()].every((count) => count === 1)).toBe(true);
  });

  it("rests each entry exactly once per cycle when the count is odd", () => {
    const resting = Array.from({ length: 9 }, (_, r) => circleRound(ids(9), r).resting);
    expect(new Set(resting).size).toBe(9);
  });
});
