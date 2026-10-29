import { describe, expect, it, vi } from "vitest";
import { doublesMatch, makePlayers, makeTournament, round } from "@/domain/__fixtures__/tournament";
import { computeStandings } from "@/domain/standings";
import { CARD_LAYOUT } from "./card-layout";
import { pageCapacity, paginate } from "./pagination";
import { canShareFiles, shareFileName, shareFiles, slugify } from "./share-files";
import { createShareSnapshot, shareKindFor, type ShareLabels, type SharePalette } from "./share-snapshot";

const labels: ShareLabels = {
  appName: "Ponyo Rally",
  kind: "Klasemen pemain",
  tournamentName: "Minggu Pagi",
  status: "Klasemen sementara",
  columns: { rank: "#", name: "Pemain", played: "Main", diff: "+/-", points: "Poin" },
  withdrawn: "keluar",
  footerLeft: "ponyorally.netlify.app",
  footerRight: "29 Okt 2026",
  pageOf: "{page} / {total}",
};
const palette = Object.fromEntries(
  ["background", "surface", "surfaceAlt", "border", "text", "textMuted", "accent", "brand", "brandText", "brandTextMuted", "gold", "goldText", "silver", "silverText", "bronze", "bronzeText"].map((k) => [k, "#000"]),
) as unknown as SharePalette;

describe("pagination", () => {
  it("derives capacity from the card's row area", () => {
    const capacity = pageCapacity();
    const used = capacity * CARD_LAYOUT.rowHeight + (capacity - 1) * CARD_LAYOUT.rowGap;
    expect(used).toBeLessThanOrEqual(CARD_LAYOUT.rowsBottom - CARD_LAYOUT.rowsTop);
    expect(used + CARD_LAYOUT.rowHeight + CARD_LAYOUT.rowGap).toBeGreaterThan(CARD_LAYOUT.rowsBottom - CARD_LAYOUT.rowsTop);
  });

  it("keeps a short list on one page", () => {
    expect(paginate([1, 2, 3], 9)).toEqual([[1, 2, 3]]);
  });

  it("fills pages exactly at the boundary", () => {
    expect(paginate(Array.from({ length: 9 }, (_, i) => i), 9)).toHaveLength(1);
    expect(paginate(Array.from({ length: 10 }, (_, i) => i), 9).map((p) => p.length)).toEqual([9, 1]);
  });

  it("includes every entry exactly once, in order", () => {
    const items = Array.from({ length: 40 }, (_, i) => `p${i}`);
    const pages = paginate(items, 9);
    expect(pages.map((p) => p.length)).toEqual([9, 9, 9, 9, 4]);
    expect(pages.flat()).toEqual(items);
  });

  it("returns no pages for no entries and rejects a zero capacity", () => {
    expect(paginate([], 9)).toEqual([]);
    expect(() => paginate([1], 0)).toThrow();
  });
});

describe("createShareSnapshot", () => {
  const t = makeTournament({
    players: makePlayers(8),
    rounds: [
      round([
        doublesMatch(["p1", "p2"], ["p3", "p4"], [12, 12]),
        doublesMatch(["p5", "p6"], ["p7", "p8"], [14, 10], 1),
      ]),
    ],
  });
  const rows = computeStandings(t);
  const snapshot = createShareSnapshot({
    tournament: t,
    rows,
    entryName: (id) => `Name ${id}`,
    labels,
    theme: "dark",
    palette,
    fontFamily: "Funnel",
    lang: "id",
  });

  it("copies the official standings without re-ranking", () => {
    expect(snapshot.entries.map((e) => e.id)).toEqual(rows.map((r) => r.id));
    expect(snapshot.entries.map((e) => [e.rank, e.tied, e.points])).toEqual(rows.map((r) => [r.rank, r.tied, r.points]));
  });

  it("keeps ties exactly as the ranking engine produced them", () => {
    const tiedRanks = snapshot.entries.filter((e) => e.tied).map((e) => e.rank);
    expect(tiedRanks.length).toBeGreaterThan(0);
    for (const entry of snapshot.entries.filter((e) => e.tied)) {
      const original = rows.find((r) => r.id === entry.id)!;
      expect(entry.rank).toBe(original.rank);
    }
  });

  it("is frozen, so later changes can't leak into an export in progress", () => {
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
    expect(Object.isFrozen(snapshot.entries[0])).toBe(true);
    expect(Object.isFrozen(snapshot.labels.columns)).toBe(true);
    // Changing the source rows afterwards doesn't touch the snapshot.
    rows[0].points = 999;
    expect(snapshot.entries[0].points).not.toBe(999);
  });

  it("changes its key when data, theme or language change", () => {
    const again = (overrides: Partial<Parameters<typeof createShareSnapshot>[0]>) =>
      createShareSnapshot({ tournament: t, rows, entryName: String, labels, theme: "dark", palette, fontFamily: "F", lang: "id", ...overrides }).key;
    expect(again({})).toBe(snapshot.key);
    expect(again({ theme: "light" })).not.toBe(snapshot.key);
    expect(again({ lang: "en" })).not.toBe(snapshot.key);
    expect(again({ tournament: { ...t, updatedAt: t.updatedAt + 1 } })).not.toBe(snapshot.key);
  });

  it("uses team standings for fixed-team formats and player standings otherwise", () => {
    expect(shareKindFor("teamAmericano")).toBe("standings");
    expect(shareKindFor("teamMexicano")).toBe("standings");
    for (const format of ["americano", "mexicano", "mixicano", "mixAmericano"] as const) {
      expect(shareKindFor(format)).toBe("leaderboard");
    }
  });
});

describe("file names", () => {
  it("are descriptive and safe", () => {
    expect(shareFileName("Sunday Rally", "leaderboard", 1)).toBe("ponyo-rally-sunday-rally-leaderboard-01.png");
    expect(shareFileName("Sunday Rally", "standings", 12)).toBe("ponyo-rally-sunday-rally-standings-12.png");
  });

  it("drop accents and symbols and fall back when nothing is left", () => {
    expect(slugify("Café Señor / Minggu Pagi!!")).toBe("cafe-senor-minggu-pagi");
    expect(slugify("🎾🎾")).toBe("tournament");
    expect(slugify("x".repeat(80)).length).toBeLessThanOrEqual(40);
  });
});

describe("native sharing", () => {
  const file = new File(["png"], "a.png", { type: "image/png" });

  it("reports unsupported when the browser lacks file sharing", async () => {
    expect(canShareFiles([file], {})).toBe(false);
    expect(canShareFiles([file], { share: vi.fn(), canShare: () => false })).toBe(false);
    expect(await shareFiles([file], {}, {})).toBe("unsupported");
  });

  it("treats the user closing the share sheet as a cancel, not an error", async () => {
    const nav = { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")) };
    expect(await shareFiles([file], {}, nav)).toBe("cancelled");
  });

  it("reports other failures and successful hand-offs", async () => {
    const failing = { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException("nope", "NotAllowedError")) };
    expect(await shareFiles([file], {}, failing)).toBe("failed");
    const ok = { canShare: () => true, share: vi.fn().mockResolvedValue(undefined) };
    expect(await shareFiles([file], { title: "t" }, ok)).toBe("shared");
    expect(ok.share).toHaveBeenCalledWith({ files: [file], title: "t" });
  });
});
