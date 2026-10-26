import { createGame, expect, matchCard, next, storedTournament, test } from "./helpers";

type Side = { p: string[]; t?: string };
type Match = { a: Side; b: Side };

test("Mixicano: asks for genders, then every team is one man and one woman", async ({ page }) => {
  const men = ["Budi", "Andi", "Joko", "Dedi"];
  const women = ["Ana", "Citra", "Dewi", "Intan"];

  await page.goto("/new");
  await page.locator('label:has(input[value="mixicano"])').click();
  await next(page);
  await page.getByLabel("Nama permainan").fill("Campuran");
  await page.getByLabel("Poin untuk menang").fill("4");
  await next(page);
  await page.getByRole("button", { name: "Tempel daftar" }).click();
  await page.getByRole("dialog").getByLabel("Satu nama per baris").fill([...men, ...women].join("\n"));
  await page.getByRole("dialog").getByRole("button", { name: "Tambahkan 8 pemain" }).click();
  await next(page);
  await expect(page.getByText("Pilih Pria atau Wanita untuk 8 pemain.")).toBeVisible();

  await createGame(page, {
    format: "Mixicano",
    name: "Campuran",
    players: [...men, ...women],
    genders: Object.fromEntries([...men.map((n) => [n, "Pria"]), ...women.map((n) => [n, "Wanita"])]),
  });

  const t = await storedTournament(page);
  const gender = new Map<string, string>(t.players.map((p: { id: string; gender: string }) => [p.id, p.gender]));
  for (const match of t.rounds[0].matches as Match[]) {
    for (const side of [match.a, match.b]) expect(side.p.map((id) => gender.get(id)).sort()).toEqual(["F", "M"]);
  }

  // Substitutes are offered from the same gender only.
  await matchCard(page, 1).getByRole("button", { name: "Pilihan untuk game 1" }).click();
  await page.getByRole("button", { name: "Ganti pemain" }).click();
  const sheet = page.getByRole("dialog");
  const firstMan = t.players.find((p: { id: string }) => p.id === (t.rounds[0].matches[0] as Match).a.p.find((id) => gender.get(id) === "M"));
  await sheet.getByRole("button", { name: firstMan.name, exact: true }).click();
  await expect(sheet.getByText("Hanya pemain pria yang bisa menggantikan.")).toBeVisible();
  for (const woman of women) await expect(sheet.getByRole("button", { name: new RegExp(`^${woman}`) })).toHaveCount(0);
});

test("Team Americano: tap to pair, teams never split", async ({ page }) => {
  await createGame(page, {
    format: "Team Americano",
    name: "Pasangan Tetap",
    players: ["Ana", "Citra", "Dewi", "Gita", "Intan", "Rina"],
    pairs: [
      ["Ana", "Citra"],
      ["Dewi", "Gita"],
      ["Intan", "Rina"],
    ],
  });

  await expect(page.getByText("Ana & Citra").or(page.getByText("Dewi & Gita")).first()).toBeVisible();
  const t = await storedTournament(page);
  expect(t.teams).toHaveLength(3);
  expect(t.rounds[0].matches).toHaveLength(1);
  expect(t.rounds[0].byes).toHaveLength(1);
});

test("Mexicano singles: one player per side", async ({ page }) => {
  await createGame(page, {
    format: "Mexicano",
    name: "Tunggal",
    singles: true,
    players: ["Ana", "Citra", "Dewi", "Gita"],
    scoring: "total",
    target: "21",
  });
  const t = await storedTournament(page);
  expect(t.mode).toBe("singles");
  for (const match of t.rounds[0].matches as Match[]) {
    expect(match.a.p).toHaveLength(1);
    expect(match.b.p).toHaveLength(1);
  }
  await expect(matchCard(page, 1)).not.toContainText("&");
});

test("singles is not offered for doubles-only formats", async ({ page }) => {
  await page.goto("/new");
  await page.locator('label:has(input[value="mixicano"])').click();
  await next(page);
  await expect(page.getByRole("radio", { name: "Tunggal · 1 vs 1" })).toBeDisabled();
  await expect(page.getByText("Format ini hanya untuk ganda.")).toBeVisible();
});
