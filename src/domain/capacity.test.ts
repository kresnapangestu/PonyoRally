import { describe, expect, it } from "vitest";
import { individualCapacity, mixedCapacity, roundCapacity, teamCapacity } from "./capacity";

describe("individualCapacity", () => {
  it("fills every court with a multiple of four in doubles", () => {
    expect(individualCapacity(8, 2, "doubles")).toEqual({ courtsUsed: 2, emptyCourts: 0, byes: 0 });
  });

  it("rests the remainder in doubles", () => {
    expect(individualCapacity(9, 2, "doubles")).toMatchObject({ courtsUsed: 2, byes: 1 });
    expect(individualCapacity(16, 3, "doubles")).toMatchObject({ courtsUsed: 3, byes: 4 });
  });

  it("leaves courts empty when there are too few players", () => {
    expect(individualCapacity(6, 3, "doubles")).toEqual({ courtsUsed: 1, emptyCourts: 2, byes: 2 });
  });

  it("uses two players per court in singles", () => {
    expect(individualCapacity(7, 4, "singles")).toEqual({ courtsUsed: 3, emptyCourts: 1, byes: 1 });
  });
});

describe("teamCapacity", () => {
  it("rests one team when the team count is odd", () => {
    expect(teamCapacity(5, 3)).toEqual({ courtsUsed: 2, emptyCourts: 1, byes: 1 });
  });
});

describe("mixedCapacity", () => {
  it("is limited by the scarcer gender", () => {
    expect(mixedCapacity(8, 4, 3)).toEqual({
      courtsUsed: 2,
      emptyCourts: 1,
      byes: 4,
      byesMen: 4,
      byesWomen: 0,
    });
  });

  it("rests odd players of each gender", () => {
    expect(mixedCapacity(5, 5, 2)).toMatchObject({ courtsUsed: 2, byesMen: 1, byesWomen: 1 });
  });

  it("fills no court with fewer than two of a gender", () => {
    expect(mixedCapacity(6, 1, 2)).toMatchObject({ courtsUsed: 0, byesMen: 6, byesWomen: 1 });
  });
});

describe("roundCapacity", () => {
  const base = { mode: "doubles" as const, courts: 2, players: 10, teams: 5, men: 6, women: 4 };

  it("dispatches by format rules", () => {
    expect(roundCapacity({ ...base, format: "americano" })).toMatchObject({ byes: 2 });
    expect(roundCapacity({ ...base, format: "teamMexicano" })).toMatchObject({ byes: 1 });
    expect(roundCapacity({ ...base, format: "mixicano" })).toMatchObject({ byesMen: 2, byesWomen: 0 });
  });
});
