import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { createGame, enterScore, expect, test } from "./helpers";

/** Width and height straight from a PNG file's IHDR header. */
async function pngSize(download: Download) {
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function openShare(page: Page) {
  await page.getByRole("button", { name: "Klasemen" }).click();
  await page.getByRole("button", { name: "Bagikan klasemen sebagai gambar" }).click();
  const sheet = page.getByRole("dialog", { name: "Bagikan klasemen" });
  await expect(sheet.getByRole("img", { name: /Gambar klasemen, halaman 1 dari/ })).toBeVisible({ timeout: 15_000 });
  return sheet;
}

/** Color of one pixel of the preview image, read back through a canvas. */
const pixel = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const img = document.querySelector<HTMLImageElement>('dialog img[alt^="Gambar klasemen"]')!;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(px, py, 1, 1).data.slice(0, 3));
    },
    [x, y],
  );

const NAMES = Array.from({ length: 22 }, (_, i) => `Pemain ${String(i + 1).padStart(2, "0")}`);

test("a short leaderboard becomes one 1080×1350 PNG, previewed and downloadable", async ({ page }) => {
  await createGame(page, { format: "Americano", name: "Sunday Rally", players: ["Ana", "Bima", "Citra", "Dewi", "Eko"] });
  await enterScore(page, 1, 1, "2");
  const sheet = await openShare(page);

  const preview = sheet.getByRole("img", { name: "Gambar klasemen, halaman 1 dari 1" });
  expect(await preview.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1080, 1350]);
  await expect(sheet.getByText("Klasemen pemain")).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Unduh semua/ })).toHaveCount(0);

  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "Unduh", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("ponyo-rally-sunday-rally-leaderboard-01.png");
  expect(await pngSize(file)).toEqual({ width: 1080, height: 1350 });
  await expect(page.getByText("1 gambar diunduh")).toBeVisible();
});

test("a long leaderboard is split into pages with every player exactly once", async ({ page }) => {
  await createGame(page, { format: "Americano", name: "Klub Besar", players: NAMES });
  await enterScore(page, 1, 1, "2");
  const sheet = await openShare(page);

  // 22 players at 9 rows per card → 3 pages.
  await expect(sheet.getByText("1 / 3", { exact: true })).toBeVisible();
  await sheet.getByRole("button", { name: "Gambar berikutnya" }).click();
  await expect(sheet.getByText("2 / 3", { exact: true })).toBeVisible();
  await expect(sheet.getByRole("img", { name: "Gambar klasemen, halaman 2 dari 3" })).toBeVisible();
  await sheet.getByRole("button", { name: "Gambar berikutnya" }).click();
  await expect(sheet.getByText("3 / 3", { exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Gambar berikutnya" })).toBeDisabled();

  const downloads: Download[] = [];
  page.on("download", (d) => downloads.push(d));
  await sheet.getByRole("button", { name: "Unduh semua (3)" }).click();
  await expect(page.getByText("3 gambar diunduh")).toBeVisible();
  await expect.poll(() => downloads.length).toBe(3);
  expect(downloads.map((d) => d.suggestedFilename())).toEqual([
    "ponyo-rally-klub-besar-leaderboard-01.png",
    "ponyo-rally-klub-besar-leaderboard-02.png",
    "ponyo-rally-klub-besar-leaderboard-03.png",
  ]);
  for (const d of downloads) expect(await pngSize(d)).toEqual({ width: 1080, height: 1350 });

  // Closing the sheet leaves the tournament untouched.
  const before = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith("ponyo:t:")));
  await sheet.getByRole("button", { name: "Tutup" }).click();
  await expect(sheet).toBeHidden();
  const after = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith("ponyo:t:")));
  expect(after).toEqual(before);
});

test("team formats share team standings", async ({ page }) => {
  await createGame(page, {
    format: "Team Mexicano",
    name: "Pasangan Tetap",
    players: ["Ana", "Bima", "Citra", "Dewi"],
    pairs: [
      ["Ana", "Bima"],
      ["Citra", "Dewi"],
    ],
  });
  await enterScore(page, 1, 1, "1");
  const sheet = await openShare(page);
  await expect(sheet.getByText("Klasemen tim")).toBeVisible();

  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "Unduh", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("ponyo-rally-pasangan-tetap-standings-01.png");
});

test("the card follows the app theme", async ({ page }) => {
  for (const [theme, background] of [
    ["light", [245, 248, 242]],
    ["dark", [10, 20, 16]],
  ] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await createGame(page, { format: "Americano", name: `Tema ${theme}`, players: ["Ana", "Bima", "Citra", "Dewi"] });
    await enterScore(page, 1, 1, "2");
    await openShare(page);
    // Bottom-left corner is the page background (the green band is at the top in both themes).
    expect(await pixel(page, 8, 1340)).toEqual(background);
    expect(await pixel(page, 8, 8)).toEqual([6, 64, 43]);
  }
});

test("uses the native share sheet when the browser supports files", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: { count: number; types: string[] }[] = [];
    (window as unknown as { __shareCalls: typeof calls }).__shareCalls = calls;
    Object.assign(navigator, {
      canShare: (data: { files?: File[] }) => Boolean(data.files?.length),
      share: async (data: { files: File[] }) => {
        calls.push({ count: data.files.length, types: data.files.map((f) => f.type) });
        if (calls.length === 2) throw new DOMException("closed", "AbortError"); // user cancels the second time
      },
    });
  });
  await createGame(page, { format: "Americano", name: "Native", players: ["Ana", "Bima", "Citra", "Dewi"] });
  await enterScore(page, 1, 1, "2");
  const sheet = await openShare(page);

  await expect(sheet.getByText(/belum bisa membagikan/)).toHaveCount(0);
  await sheet.getByRole("button", { name: "Bagikan gambar ini" }).click();
  await sheet.getByRole("button", { name: "Bagikan gambar ini" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shareCalls: unknown[] }).__shareCalls.length)).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { __shareCalls: unknown[] }).__shareCalls[0])).toEqual({
    count: 1,
    types: ["image/png"],
  });
  // A cancelled share is not an error.
  await expect(page.getByText("Menu bagikan tidak bisa dibuka")).toHaveCount(0);
});

test("without file sharing, it explains and keeps the download", async ({ page }) => {
  await page.addInitScript(() => Object.assign(navigator, { canShare: undefined, share: undefined }));
  await createGame(page, { format: "Americano", name: "Tanpa Share", players: ["Ana", "Bima", "Citra", "Dewi"] });
  await enterScore(page, 1, 1, "2");
  const sheet = await openShare(page);
  await expect(sheet.getByText(/belum bisa membagikan gambar langsung/)).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Bagikan gambar ini" })).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Unduh", exact: true })).toBeEnabled();
});
