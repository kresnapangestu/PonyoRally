import { describe, expect, it } from "vitest";
import type { Gender } from "../types";
import { hasBlockingIssues, validateSetup, type SetupDraft } from "./setup";

const players = (count: number, genders?: Gender[]) =>
  Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, gender: genders?.[i] }));

const draft = (overrides: Partial<SetupDraft> = {}): SetupDraft => ({
  name: "Minggu Pagi",
  format: "americano",
  mode: "doubles",
  courtNames: ["Lapangan 1", "Lapangan 2"],
  scoring: "race",
  targetPoints: 4,
  players: players(8),
  teams: [],
  ...overrides,
});

const codes = (d: SetupDraft) => validateSetup(d).map((i) => i.code);

describe("validateSetup — basics", () => {
  it("accepts a complete Americano setup with no issues", () => {
    expect(validateSetup(draft())).toEqual([]);
  });

  it("requires a game name and caps its length", () => {
    expect(codes(draft({ name: "   " }))).toContain("nameRequired");
    expect(codes(draft({ name: "x".repeat(41) }))).toContain("nameTooLong");
  });

  it("requires a format", () => {
    const issues = validateSetup(draft({ format: null }));
    expect(issues.map((i) => i.code)).toEqual(["formatRequired"]);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("checks the court count and each court name", () => {
    expect(codes(draft({ courtNames: [] }))).toEqual(["courtsRange"]);
    const issues = validateSetup(draft({ courtNames: ["A", " ", "a"] }));
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "courtNameRequired", courtIndex: 1 }),
        expect.objectContaining({ code: "courtNameDuplicate", courtIndex: 2 }),
      ]),
    );
  });

  it("requires target points the host typed", () => {
    expect(codes(draft({ targetPoints: null }))).toContain("pointsRange");
    expect(codes(draft({ targetPoints: 0 }))).toContain("pointsRange");
    expect(codes(draft({ targetPoints: 100 }))).toContain("pointsRange");
    expect(codes(draft({ targetPoints: 21.5 }))).toContain("pointsRange");
    expect(codes(draft({ targetPoints: 4 }))).not.toContain("pointsRange");
    expect(codes(draft({ scoring: "total", targetPoints: 24 }))).not.toContain("pointsRange");
  });

  it("flags empty player names on their row", () => {
    const list = players(8);
    list[3].name = " ";
    expect(validateSetup(draft({ players: list }))).toContainEqual(
      expect.objectContaining({ code: "playerNameRequired", playerId: "p4" }),
    );
  });

  it("allows duplicate player names", () => {
    const list = players(8).map((p, i) => (i < 2 ? { ...p, name: "BUNA" } : p));
    expect(hasBlockingIssues(validateSetup(draft({ players: list })))).toBe(false);
  });

  it("caps the roster size", () => {
    expect(codes(draft({ players: players(41) }))).toContain("tooManyPlayers");
  });
});

describe("validateSetup — singles/doubles compatibility", () => {
  it("allows singles for Americano and Mexicano", () => {
    expect(codes(draft({ mode: "singles" }))).not.toContain("modeUnsupported");
    expect(codes(draft({ mode: "singles", format: "mexicano" }))).not.toContain("modeUnsupported");
  });

  it.each(["teamAmericano", "teamMexicano", "mixicano", "mixAmericano"] as const)(
    "blocks singles for %s",
    (format) => {
      expect(codes(draft({ mode: "singles", format }))).toContain("modeUnsupported");
    },
  );
});

describe("validateSetup — individual formats", () => {
  it("needs four players for doubles and two for singles", () => {
    expect(codes(draft({ players: players(3) }))).toContain("tooFewPlayers");
    expect(codes(draft({ players: players(2), mode: "singles" }))).not.toContain("tooFewPlayers");
  });

  it("reports byes as info, not an error", () => {
    const issues = validateSetup(draft({ players: players(10) }));
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "byesPerRound", severity: "info", params: { count: 2 } }),
    );
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("reports empty courts as info", () => {
    expect(validateSetup(draft({ courtNames: ["A", "B", "C"] }))).toContainEqual(
      expect.objectContaining({ code: "emptyCourts", params: { count: 1 } }),
    );
  });

  it("warns about limited variety with few players", () => {
    expect(validateSetup(draft({ players: players(5) }))).toContainEqual(
      expect.objectContaining({ code: "limitedVariety", severity: "warning" }),
    );
  });
});

describe("validateSetup — mixed formats", () => {
  const mixed = (genders: (Gender | undefined)[]) =>
    draft({ format: "mixicano", players: players(genders.length, genders as Gender[]) });

  it("requires a gender for every player", () => {
    expect(validateSetup(mixed(["M", "F", undefined, "F"]))).toContainEqual(
      expect.objectContaining({ code: "genderMissing", params: { count: 1 } }),
    );
  });

  it("needs at least two of each gender", () => {
    const issues = codes(mixed(["M", "M", "M", "F"]));
    expect(issues).toContain("notEnoughWomen");
    expect(issues).not.toContain("notEnoughMen");
  });

  it("allows unequal genders and reports byes per gender", () => {
    const issues = validateSetup(mixed(["M", "M", "M", "M", "M", "M", "M", "M", "F", "F", "F", "F"]));
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "mixedByesPerRound", params: { men: 4, women: 0 } }),
    );
  });

  it("applies to Mix Americano too", () => {
    const d = draft({ format: "mixAmericano", players: players(4) });
    expect(codes(d)).toContain("genderMissing");
  });
});

describe("validateSetup — fixed-team formats", () => {
  const teamDraft = (teams: [string, string][], count = 8) =>
    draft({ format: "teamAmericano", players: players(count), teams });

  it("requires every player to be paired", () => {
    expect(validateSetup(teamDraft([["p1", "p2"], ["p3", "p4"]]))).toContainEqual(
      expect.objectContaining({ code: "unpairedPlayers", params: { count: 4 } }),
    );
  });

  it("needs at least two teams", () => {
    expect(codes(teamDraft([["p1", "p2"]], 2))).toContain("tooFewTeams");
  });

  it("reports a resting team when the team count is odd", () => {
    const teams: [string, string][] = [["p1", "p2"], ["p3", "p4"], ["p5", "p6"], ["p7", "p8"], ["p9", "p10"]];
    const issues = validateSetup(teamDraft(teams, 10));
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(issues).toContainEqual(expect.objectContaining({ code: "teamByesPerRound", params: { count: 1 } }));
  });

  it("warns when there are fewer than four teams", () => {
    expect(validateSetup(teamDraft([["p1", "p2"], ["p3", "p4"]], 4))).toContainEqual(
      expect.objectContaining({ code: "fewTeams", severity: "warning" }),
    );
  });
});
