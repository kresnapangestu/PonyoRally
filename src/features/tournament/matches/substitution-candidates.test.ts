import { describe, expect, it } from "vitest";
import { doublesMatch, makePlayers, makeTournament, round } from "@/domain/__fixtures__/tournament";
import { substitutionCandidates } from "./substitution-candidates";

describe("substitutionCandidates", () => {
  const t = makeTournament({
    players: [...makePlayers(10).slice(0, 9), { ...makePlayers(10)[9], status: "withdrawn" as const }],
    rounds: [
      {
        ...round([doublesMatch(["p1", "p2"], ["p3", "p4"]), doublesMatch(["p5", "p6"], ["p7", "p8"], undefined, 1)], ["p9"]),
      },
    ],
  });

  it("offers resting players first and busy players last, never withdrawn ones", () => {
    const list = substitutionCandidates(t, 0, 0, "p1");
    expect(list[0]).toEqual({ id: "p9", kind: "resting" });
    expect(list.slice(1).every((c) => c.kind === "busy" && c.matchIndex === 1)).toBe(true);
    expect(list.map((c) => c.id)).not.toContain("p10");
    expect(list.map((c) => c.id)).not.toContain("p2");
  });

  it("only offers the same gender in mixed formats", () => {
    const players = makePlayers(9, ["M", "F", "M", "F", "M", "F", "M", "F", "F"]);
    const mixed = { ...t, format: "mixicano" as const, players };
    expect(substitutionCandidates(mixed, 0, 0, "p1").map((c) => c.id)).toEqual(["p5", "p7"]);
  });
});
