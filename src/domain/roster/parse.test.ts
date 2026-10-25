import { describe, expect, it } from "vitest";
import { cleanName, findDuplicateNameKeys, parseRosterText } from "./parse";

const SAMPLE = `Putrimut
BUNA
BUNA
Jubaedah
Nina
Marisa
Mia
Elvi
Olvi
Iren
Ratih
Payudi
Silvia
Olvi
Resi
Iqbal `;

describe("parseRosterText", () => {
  it("turns the sample list into 16 players, keeping duplicates", () => {
    const { names, emptyLines, rejected } = parseRosterText(SAMPLE);
    expect(names).toHaveLength(16);
    expect(names.filter((n) => n === "BUNA")).toHaveLength(2);
    expect(names.filter((n) => n === "Olvi")).toHaveLength(2);
    expect(names.at(-1)).toBe("Iqbal");
    expect(emptyLines).toBe(0);
    expect(rejected).toEqual([]);
  });

  it("ignores and counts blank lines, but not a trailing newline", () => {
    expect(parseRosterText("Nina\n\n   \nMia\n")).toMatchObject({
      names: ["Nina", "Mia"],
      emptyLines: 2,
    });
  });

  it("handles Windows and old Mac line endings", () => {
    expect(parseRosterText("Nina\r\nMia\rElvi").names).toEqual(["Nina", "Mia", "Elvi"]);
  });

  it("strips list numbering and bullets", () => {
    const text = "1. Nina\n2) Mia\n3 - Elvi\n- Olvi\n• Iren\n* Ratih\n10.Resi";
    expect(parseRosterText(text).names).toEqual(["Nina", "Mia", "Elvi", "Olvi", "Iren", "Ratih", "Resi"]);
  });

  it("keeps names that merely contain digits", () => {
    expect(parseRosterText("Budi 2\nR2D2\n3M").names).toEqual(["Budi 2", "R2D2", "3M"]);
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
    expect(findDuplicateNameKeys(["BUNA", "buna", "Nina", "Olvi", "Olvi "])).toEqual(
      new Set(["buna", "olvi"]),
    );
  });
});
