import { describe, expect, it } from "vitest";
import { displayNames } from "./display";

describe("displayNames", () => {
  it("numbers repeated names in order of entry, ignoring case", () => {
    const names = displayNames([
      { id: "a", name: "BUNA" },
      { id: "b", name: "Nina" },
      { id: "c", name: "buna" },
      { id: "d", name: "BUNA" },
    ]);
    expect([...names.values()]).toEqual(["BUNA", "Nina", "buna 2", "BUNA 3"]);
  });

  it("leaves unique names untouched", () => {
    expect(displayNames([{ id: "a", name: "Iqbal" }]).get("a")).toBe("Iqbal");
  });
});
