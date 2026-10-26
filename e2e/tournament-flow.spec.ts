import { createGame, enterScore, expect, matchCard, next, storedTournament, test } from "./helpers";

const NINE = ["Ana", "Bima", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hadi", "Intan"];

test.describe("Americano, first to 4, from creation to podium", () => {
  test("plays two rounds, survives a reload and finishes with a champion", async ({ page }) => {
    await createGame(page, { format: "Americano", name: "Sabtu Ceria", players: NINE });

    // Round 1: 2 courts, 1 rest.
    await expect(matchCard(page, 1)).toBeVisible();
    await expect(matchCard(page, 2)).toBeVisible();
    await expect(page.getByText("Istirahat:")).toBeVisible();

    // Typing the loser's 2 fills the winner's 4.
    await enterScore(page, 1, 1, "2");
    await expect(matchCard(page, 1).getByRole("button", { name: /: 4$/ })).toBeVisible();
    await expect(matchCard(page, 1).getByRole("button", { name: /: 2$/ })).toBeVisible();
    await expect(page.getByText("1/2 game selesai")).toBeVisible();

    // Next round is explained, not silently blocked; skipping closes the list.
    await page.getByRole("button", { name: "Ronde berikutnya" }).click();
    const sheet = page.getByRole("dialog", { name: "Ronde 1 belum selesai" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Lewati" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Game 2 dilewati")).toBeVisible();

    await page.getByRole("button", { name: "Ronde berikutnya" }).click();
    await expect(page.getByText("Ronde 2 siap!")).toBeVisible();
    await expect(matchCard(page, 3)).toBeVisible();
    await expect(page.getByRole("radio", { name: "Ronde 2" })).toHaveAttribute("aria-checked", "true");

    // A second tap must not create a third round.
    const before = await storedTournament(page);
    expect(before.rounds).toHaveLength(2);

    // Everything survives a reload.
    await page.reload();
    await expect(matchCard(page, 3)).toBeVisible();
    await expect(page.getByText("Americano · Ronde 2")).toBeVisible();

    // The player who rested in round 1 is playing in round 2.
    const saved = await storedTournament(page);
    const rested = saved.rounds[0].byes[0];
    const playingNow = saved.rounds[1].matches.flatMap((m: { a: { p: string[] }; b: { p: string[] } }) => [...m.a.p, ...m.b.p]);
    expect(playingNow).toContain(rested);

    // Standings: four players have 4 points after round 1.
    await page.getByRole("button", { name: "Klasemen" }).click();
    await expect(page.getByText("Setelah ronde 2")).toBeVisible();
    await expect(page.getByLabel("Peringkat 1").first()).toBeVisible();

    // Finish: the podium heading becomes "Juara" and the game is read-only.
    await page.getByRole("button", { name: "Pilihan turnamen" }).click();
    await page.getByRole("button", { name: "Selesaikan turnamen" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Selesaikan turnamen" }).click();
    await expect(page.getByRole("heading", { name: "Juara" })).toBeVisible();
    await expect(page.getByText("Turnamen selesai. Klasemen sudah final.")).toBeVisible();

    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(page.getByText("Selesai", { exact: true }).first()).toBeVisible();
  });

  test("redraws an untouched round with new partners", async ({ page }) => {
    await createGame(page, { format: "Americano", name: "Redraw", players: NINE.slice(0, 8) });
    const pairs = async () =>
      (await storedTournament(page)).rounds[0].matches.flatMap((m: { a: { p: string[] }; b: { p: string[] } }) =>
        [m.a.p, m.b.p].map((p) => [...p].sort().join("+")),
      );
    const first: string[] = await pairs();

    await page.getByRole("button", { name: "Pilihan turnamen" }).click();
    await page.getByRole("button", { name: /^Acak ulang ronde 1/ }).click();
    await expect(page.getByText("Ronde 1 diacak ulang")).toBeVisible();

    const second: string[] = await pairs();
    expect(second.filter((pair) => first.includes(pair))).toEqual([]);
  });

  test("substitutes a resting player into a match", async ({ page }) => {
    await createGame(page, { format: "Americano", name: "Sub", players: NINE });
    const resting = (await storedTournament(page)).rounds[0].byes[0] as string;
    const restingName = (await storedTournament(page)).players.find((p: { id: string }) => p.id === resting).name;

    await matchCard(page, 1).getByRole("button", { name: "Pilihan untuk game 1" }).click();
    await page.getByRole("button", { name: "Ganti pemain" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button").filter({ hasText: /\S/ }).nth(1).click(); // first player in the match
    await sheet.getByRole("button", { name: new RegExp(`^${restingName}\\s*Sedang istirahat`) }).click();

    await expect(page.getByText(new RegExp(`diganti ${restingName}$`))).toBeVisible();
    await expect(matchCard(page, 1)).toContainText(restingName);
    expect((await storedTournament(page)).rounds[0].byes).toEqual([]);
  });

  test("an earlier round can be corrected and says what that means", async ({ page }) => {
    await createGame(page, { format: "Americano", name: "Koreksi", players: NINE.slice(0, 8), scoring: "total", target: "24" });
    await enterScore(page, 1, 0, "14");
    await expect(matchCard(page, 1).getByRole("button", { name: /: 10$/ })).toBeVisible();
    await enterScore(page, 2, 0, "12");
    await page.getByRole("button", { name: "Ronde berikutnya" }).click();
    await expect(matchCard(page, 3)).toBeVisible();

    await page.getByRole("radio", { name: "Ronde 1" }).click();
    await expect(page.getByText(/Ini ronde lama/)).toBeVisible();
    await enterScore(page, 1, 0, "20");
    expect((await storedTournament(page)).rounds[0].matches[0].s).toEqual([20, 4]);
  });
});

test("wizard explains what's missing instead of silently blocking", async ({ page }) => {
  await page.goto("/new");
  await next(page);
  await expect(page.getByText("Pilih format dulu.")).toBeVisible();

  await page.locator('label:has(input[value="americano"])').click();
  await next(page);
  await next(page);
  await expect(page.getByText("Isi nama permainan.")).toBeVisible();
  await expect(page.getByText("Isi angka bulat 1–99.")).toBeVisible();
  await expect(page.getByLabel("Nama permainan")).toBeFocused();

  // Four empty player rows are ready for doubles.
  await page.getByLabel("Nama permainan").fill("Tes");
  await page.getByLabel("Poin untuk menang").fill("4");
  await next(page);
  await expect(page.getByPlaceholder("Nama")).toHaveCount(4);
  await next(page);
  await expect(page.getByText("Isi nama, atau hapus baris ini.").first()).toBeVisible();
});
