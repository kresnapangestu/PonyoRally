import { readFile } from "node:fs/promises";
import { createGame, expect, test } from "./helpers";

test("switching language keeps the game and translates the app", async ({ page }) => {
  await createGame(page, { format: "Americano", name: "Bahasa", players: ["A1", "B2", "C3", "D4"] });
  await page.getByRole("button", { name: "Kembali" }).click();
  await page.getByRole("link", { name: "Pengaturan" }).click();
  await page.getByText("English", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByText("In progress")).toBeVisible();
  await expect(page.getByText("Bahasa", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("dark theme is applied before the page paints", async ({ page }) => {
  await page.goto("/settings");
  await page.getByText("Gelap", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // On reload the boot script sets the theme from storage before React runs.
  const themeAtParse = page.waitForEvent("console", (msg) => msg.text().startsWith("theme:"));
  await page.addInitScript(() =>
    document.addEventListener("DOMContentLoaded", () => console.log(`theme:${document.documentElement.dataset.theme}`)),
  );
  await page.reload();
  expect((await themeAtParse).text()).toBe("theme:dark");
});

test("backup: export, delete, import brings the game back", async ({ page }) => {
  await createGame(page, { format: "Mexicano", name: "Cadangan", players: ["Ana", "Citra", "Dewi", "Gita"] });

  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Ekspor cadangan/ }).click();
  const file = await (await download).path();
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup).toMatchObject({ app: "ponyo-rally", kind: "backup" });
  expect(backup.tournaments).toHaveLength(1);

  // Delete the game from its own menu.
  await page.goto("/");
  await page.getByRole("link", { name: /Cadangan/ }).click();
  await page.getByRole("button", { name: "Pilihan turnamen" }).click();
  await page.getByRole("button", { name: "Hapus turnamen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByText("Belum ada permainan")).toBeVisible();

  // Import it back.
  await page.getByRole("link", { name: "Pengaturan" }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  const sheet = page.getByRole("dialog", { name: "Impor cadangan" });
  await expect(sheet.getByText("File ini berisi 1 turnamen.")).toBeVisible();
  await sheet.getByRole("button", { name: "Tambahkan yang belum ada" }).click();
  await expect(page.getByText("1 turnamen diimpor")).toBeVisible();

  await page.getByRole("link", { name: "Beranda" }).click();
  await expect(page.getByRole("link", { name: /Cadangan/ })).toBeVisible();
});

test("a file that isn't a backup is rejected with a clear message", async ({ page }) => {
  await page.goto("/settings");
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "world" })),
  });
  await expect(page.getByText("Ini bukan file cadangan Ponyo Rally.")).toBeVisible();
});

test("unknown pages show the 404 artwork with a way home", async ({ page }) => {
  const response = await page.goto("/fitur-baru");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /404/ })).toBeAttached();
  await page.getByRole("link", { name: "Kembali ke beranda" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("splash shows on first open and is skipped on the next load", async ({ browser }) => {
  const page = await browser.newPage(); // without the helper that marks it as seen
  await page.goto("/");
  await expect(page.locator(".splash")).toBeVisible();
  await expect(page.locator(".splash")).toBeHidden({ timeout: 8_000 });
  await page.reload();
  await expect(page.locator(".splash")).toBeHidden();
  await page.close();
});
