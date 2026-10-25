import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  resolveCourtNames,
  unpairedPlayers,
  withCourtCount,
  withCourtName,
  withMinimumRows,
  withPair,
  withPlayerRemoved,
  withPlayersAdded,
  withRemainingPaired,
  withoutPair,
} from "./draft";

let n = 0;
const nextId = () => `p${++n}`;
const defaultName = (i: number) => `Lapangan ${i + 1}`;

describe("draft courts", () => {
  it("uses translated defaults unless the host typed a name", () => {
    let d = withCourtCount(emptyDraft(nextId), 3);
    d = withCourtName(d, 1, "Center");
    expect(resolveCourtNames(d, defaultName)).toEqual(["Lapangan 1", "Center", "Lapangan 3"]);
    expect(resolveCourtNames(d, (i) => `Court ${i + 1}`)[0]).toBe("Court 1");
  });

  it("clamps the court count and drops names for removed courts", () => {
    let d = withCourtName(withCourtCount(emptyDraft(nextId), 3), 2, "Back");
    d = withCourtCount(d, 2);
    expect(d.courtNameOverrides).toEqual({});
    expect(withCourtCount(d, 0).courtCount).toBe(1);
    expect(withCourtCount(d, 99).courtCount).toBe(12);
  });

  it("clearing a custom name restores the default", () => {
    const d = withCourtName(withCourtName(emptyDraft(nextId), 0, "A"), 0, "  ");
    expect(resolveCourtNames(d, defaultName)[0]).toBe("Lapangan 1");
  });
});

describe("draft players and teams", () => {
  const named = (names: string[]) => {
    n = 0;
    return withPlayersAdded(emptyDraft(nextId), names, nextId);
  };

  it("starts with one court's worth of blank rows: 4 for doubles, 2 for singles", () => {
    n = 0;
    const doubles = emptyDraft(nextId);
    expect(doubles.players).toEqual([
      { id: "p1", name: "" },
      { id: "p2", name: "" },
      { id: "p3", name: "" },
      { id: "p4", name: "" },
    ]);
    const singles = withMinimumRows({ ...doubles, mode: "singles" }, nextId);
    expect(singles.players.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("never drops a typed name when switching to singles", () => {
    const d = named(["A", "B", "C"]);
    expect(withMinimumRows({ ...d, mode: "singles" }, nextId).players.map((p) => p.name)).toEqual(["A", "B", "C"]);
  });

  it("fills blank rows first, then appends, keeping duplicates", () => {
    const d = named(["BUNA", "BUNA", "Nina", "Mia", "Elvi"]);
    expect(d.players).toEqual([
      { id: "p1", name: "BUNA" },
      { id: "p2", name: "BUNA" },
      { id: "p3", name: "Nina" },
      { id: "p4", name: "Mia" },
      { id: "p5", name: "Elvi" },
    ]);
  });

  it("adds a new blank row for 'Add player'", () => {
    expect(named([""]).players).toHaveLength(5);
  });

  it("pairs two unpaired players, never the same player twice", () => {
    let d = named(["A", "B", "C", "D"]);
    d = withPair(d, "p1", "p2");
    expect(withPair(d, "p1", "p3")).toBe(d);
    expect(withPair(d, "p3", "p3")).toBe(d);
    expect(unpairedPlayers(d).map((p) => p.id)).toEqual(["p3", "p4"]);
    expect(withoutPair(d, 0).teams).toEqual([]);
  });

  it("removing a player also breaks their pair", () => {
    const d = withPair(named(["A", "B", "C", "D"]), "p1", "p2");
    expect(withPlayerRemoved(d, "p1")).toMatchObject({ teams: [] });
    expect(withPlayerRemoved(d, "p1").players.map((p) => p.id)).toEqual(["p2", "p3", "p4"]);
  });

  it("pairs the rest randomly, leaving an odd one out", () => {
    const d = withRemainingPaired({ ...named(["A", "B", "C"]), players: named(["A", "B", "C"]).players.slice(0, 3) }, (x) => x);
    expect(d.teams).toEqual([["p1", "p2"]]);
  });
});
