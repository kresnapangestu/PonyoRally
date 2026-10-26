import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** Every test starts with the splash already "seen" so it doesn't wait 5 s. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => sessionStorage.setItem("ponyo:splash-seen", "1"));
    await provide(page);
  },
});
export { expect };

const FORMAT_VALUES = {
  Americano: "americano",
  "Team Americano": "teamAmericano",
  "Mix Americano": "mixAmericano",
  Mexicano: "mexicano",
  "Team Mexicano": "teamMexicano",
  Mixicano: "mixicano",
} as const;

export interface GameSetup {
  format: keyof typeof FORMAT_VALUES;
  name: string;
  players: string[];
  scoring?: "race" | "total";
  target?: string;
  singles?: boolean;
  courts?: number;
  /** Mixed formats: name → gender. */
  genders?: Record<string, "Pria" | "Wanita">;
  /** Fixed-team formats: pairs to tap. */
  pairs?: [string, string][];
}

export const next = (page: Page) => page.getByRole("button", { name: "Lanjut", exact: true }).click();

/** Walks the whole creation wizard like a host would, ending on the tournament screen. */
export async function createGame(page: Page, setup: GameSetup) {
  // The wizard keeps unfinished input across loads; start from a clean draft.
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("ponyo:draft"));
  await page.goto("/new");
  await page.locator(`label:has(input[value="${FORMAT_VALUES[setup.format]}"])`).click();
  await next(page);

  await page.getByLabel("Nama permainan").fill(setup.name);
  if (setup.singles) await page.getByText("Tunggal · 1 vs 1", { exact: true }).click();
  for (let c = 2; c < (setup.courts ?? 2); c++) {
    await page.getByRole("button", { name: "Tambah Jumlah lapangan" }).click();
  }
  if (setup.scoring === "total") await page.getByText("Total poin", { exact: true }).click();
  await page.getByLabel(setup.scoring === "total" ? "Total poin per pertandingan" : "Poin untuk menang").fill(setup.target ?? "4");
  await next(page);

  await page.getByRole("button", { name: "Tempel daftar" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Satu nama per baris").fill(setup.players.join("\n"));
  await sheet.getByRole("button", { name: /^Tambahkan \d+ pemain$/ }).click();
  await expect(sheet).toBeHidden();

  for (const [name, gender] of Object.entries(setup.genders ?? {})) {
    await page.getByRole("group", { name: `Jenis kelamin ${name}` }).getByText(gender, { exact: true }).click();
  }
  await next(page);

  if (setup.pairs) {
    for (const [a, b] of setup.pairs) {
      await page.getByRole("button", { name: a, exact: true }).click();
      await page.getByRole("button", { name: b, exact: true }).click();
    }
    await next(page);
  }

  await expect(page.getByRole("heading", { name: "Periksa lagi" })).toBeVisible();
  await page.getByRole("button", { name: "Buat permainan" }).click();
  await expect(page).toHaveURL(/\/tournament\?id=/);
  await expect(page.getByRole("heading", { name: setup.name })).toBeVisible();
}

export const matchCard = (page: Page, game: number): Locator =>
  page.locator("article").filter({ has: page.getByText(`Game ${game}`, { exact: true }) });

/** Opens the keypad from one side of a match and types a score. */
export async function enterScore(page: Page, game: number, side: 0 | 1, digits: string) {
  await matchCard(page, game).getByRole("button", { name: /^Skor / }).nth(side).click();
  const sheet = page.getByRole("dialog");
  for (const digit of digits) await sheet.getByRole("button", { name: digit, exact: true }).click();
  await sheet.getByRole("button", { name: "Simpan skor" }).click();
  await expect(sheet).toBeHidden();
}

/** The open tournament as stored in localStorage (what the app would reload). */
export async function storedTournament(page: Page) {
  const id = new URL(page.url()).searchParams.get("id");
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.data, `ponyo:t:${id}`);
}
