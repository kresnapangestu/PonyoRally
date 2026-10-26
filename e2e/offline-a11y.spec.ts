import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { createGame, enterScore, expect, test } from "./helpers";

test("opens with no connection once it has been loaded", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Second load: the service worker now controls the page and has cached it.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.goto("/new");
  await expect(page.getByRole("heading", { name: "Pilih format" })).toBeVisible();
  await page.goto("/tournament?id=missing");
  await expect(page.getByText("Turnamen tidak ditemukan.")).toBeVisible();
  await context.setOffline(false);
});

async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const problems = results.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(problems).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test(`no WCAG A/AA violations on the main screens (${theme})`, async ({ page }) => {
    // Reduced motion: axe must not measure contrast halfway through a fade-in.
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });

    await page.goto("/");
    await expectAccessible(page, "home (empty)");

    await createGame(page, {
      format: "Americano",
      name: "Aksesibel",
      players: ["Ana", "Citra", "Dewi", "Gita", "Intan"],
    });
    await enterScore(page, 1, 1, "2");
    await expectAccessible(page, "matches");

    await page.getByRole("button", { name: "Klasemen" }).click();
    await expect(page.getByText("Setelah ronde 1")).toBeVisible();
    await expectAccessible(page, "leaderboard");

    await page.getByRole("button", { name: "Pemain", exact: true }).click();
    await expectAccessible(page, "players");

    await page.goto("/new");
    await expectAccessible(page, "wizard");

    await page.goto("/settings");
    await expectAccessible(page, "settings");
  });
}
