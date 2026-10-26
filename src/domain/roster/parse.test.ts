import { describe, expect, it } from "vitest";
import { cleanName, findDuplicateNameKeys, parseRosterText } from "./parse";

const SAMPLE = `John Doe
Jane Doe
Alex Morgan
Chris Taylor
Sam Wilson
Jamie Parker
Riley Carter
Jordan Blake
Casey Miller
Taylor Brooks
Morgan Reed
Avery Scott
Cameron Hayes
Robin Foster
Dylan Cooper
Charlie Bennett`;

describe("parseRosterText", () => {
  it("turns the sample list into 16 players", () => {
    const { names, emptyLines, rejected } = parseRosterText(SAMPLE);
    expect(names).toHaveLength(16);
    expect(names[0]).toBe("John Doe");
    expect(names.at(-1)).toBe("Charlie Bennett");
    expect(emptyLines).toBe(0);
    expect(rejected).toEqual([]);
  });

  it("keeps duplicate names as separate players", () => {
    const { names } = parseRosterText("Sam Wilson\nJane Doe\nSam Wilson\nJane Doe ");
    expect(names).toEqual(["Sam Wilson", "Jane Doe", "Sam Wilson", "Jane Doe"]);
  });

  it("ignores and counts blank lines, but not a trailing newline", () => {
    expect(parseRosterText("Nina\n\n   \nMia\n")).toMatchObject({
      names: ["Nina", "Mia"],
      emptyLines: 2,
    });
  });

  it("handles Windows and old Mac line endings", () => {
    expect(parseRosterText("Nina\r\nMia\rElvi").names).toEqual([
      "Nina",
      "Mia",
      "Elvi",
    ]);
  });

  it("strips list numbering and bullets", () => {
    const text = "1. Nina\n2) Mia\n3 - Elvi\n- Olvi\n• Iren\n* Ratih\n10.Resi";
    expect(parseRosterText(text).names).toEqual([
      "Nina",
      "Mia",
      "Elvi",
      "Olvi",
      "Iren",
      "Ratih",
      "Resi",
    ]);
  });

  it("keeps names that merely contain digits", () => {
    expect(parseRosterText("Budi 2\nR2D2\n3M").names).toEqual([
      "Budi 2",
      "R2D2",
      "3M",
    ]);
  });

  it("rejects overlong lines with their line number", () => {
    const long = "x".repeat(41);
    const { names, rejected } = parseRosterText(`Nina\n${long}`);
    expect(names).toEqual(["Nina"]);
    expect(rejected).toEqual([{ line: 2, text: long, reason: "tooLong" }]);
  });

  it("returns nothing for empty input", () => {
    expect(parseRosterText("").names).toEqual([]);
  });
});

describe("cleanName", () => {
  it("collapses spaces and removes invisible characters", () => {
    expect(cleanName("  Putri​   mut  ")).toBe("Putri mut");
  });
});

describe("findDuplicateNameKeys", () => {
  it("matches names case-insensitively", () => {
    expect(
      findDuplicateNameKeys(["BUNA", "buna", "Nina", "Olvi", "Olvi "]),
    ).toEqual(new Set(["buna", "olvi"]));
  });
});
