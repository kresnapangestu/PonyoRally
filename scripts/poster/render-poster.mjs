// Renders the tester recruitment poster (1080×1350 PNG) with real app screenshots.
//
//   npm run build
//   node scripts/poster/render-poster.mjs --url https://ponyorally.netlify.app [--wa 0812-xxxx-xxxx]
//
// Output: poster/ponyo-rally-uji-coba.png
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import QRCode from "qrcode";

const PORT = 4181;
const BASE = `http://localhost:${PORT}`;
const OUT = "poster/ponyo-rally-uji-coba.png";
const PLAYERS = ["Ana", "Bima", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hadi", "Intan"];

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const url = arg("url");
const wa = arg("wa");

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dataUri = (buffer, type) => `data:${type};base64,${buffer.toString("base64")}`;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Static server did not start. Run `npm run build` first.");
}

/** Plays a short Americano session and screenshots the match list and the standings. */
async function captureScreens(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("ponyo:splash-seen", "1"));

  await page.goto(`${BASE}/new`);
  await page.locator('label:has(input[value="americano"])').click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByLabel("Nama permainan").fill("Minggu Pagi");
  await page.getByLabel("Poin untuk menang").fill("4");
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Tempel daftar" }).click();
  await page.getByRole("dialog").getByLabel("Satu nama per baris").fill(PLAYERS.join("\n"));
  await page.getByRole("dialog").getByRole("button", { name: /^Tambahkan/ }).click();
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await page.getByRole("button", { name: "Buat permainan" }).click();
  await page.waitForURL(/tournament/);

  const score = async (game, side, digit) => {
    const card = page.locator("article").filter({ has: page.getByText(`Game ${game}`, { exact: true }) });
    await card.getByRole("button", { name: /^Skor / }).nth(side).click();
    await page.getByRole("dialog").getByRole("button", { name: digit, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Simpan skor" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  };

  // Round 1 fully scored, then round 2 with one result in: a lively, realistic screen.
  await score(1, 1, "2");
  await score(2, 0, "3");
  await page.getByRole("button", { name: "Ronde berikutnya" }).click();
  await page.getByText("Game 3", { exact: true }).waitFor();
  await score(3, 1, "1");
  await page.waitForTimeout(4200); // let the toast disappear
  const matches = await page.screenshot();

  await page.getByRole("button", { name: "Klasemen" }).click();
  await page.getByText("Setelah ronde 2").waitFor();
  await page.waitForTimeout(500);
  const standings = await page.screenshot();

  await context.close();
  return { matches, standings };
}

async function main() {
  const server = spawn("node", ["scripts/serve-static.mjs", "out", String(PORT)], { stdio: "ignore" });
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const shots = await captureScreens(browser);

    const qr = url
      ? await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#06402B", light: "#FFFFFF" }, errorCorrectionLevel: "M" })
      : `<div style="height:100%;display:grid;place-items:center;border:4px dashed #06402B;border-radius:12px;font-size:20px;font-weight:700;text-align:center">QR<br/>menyusul</div>`;
    const urlText = url ? escapeHtml(url.replace(/^https?:\/\//, "").replace(/\/$/, "")) : "link menyusul";

    const template = await readFile("scripts/poster/poster.html", "utf8");
    const html = template
      .replace("{{LOGO}}", dataUri(await readFile("public/brand/favicon-ponyo.png"), "image/png"))
      .replace("{{SHOT_MATCHES}}", dataUri(shots.matches, "image/png"))
      .replace("{{SHOT_STANDINGS}}", dataUri(shots.standings, "image/png"))
      .replace("{{QR}}", qr)
      .replace("{{URL_TEXT}}", urlText)
      .replace("{{WA_BLOCK}}", wa ? `<span class="wa">WA ${escapeHtml(wa)}</span>` : "");

    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await mkdir("poster", { recursive: true });
    await writeFile(OUT, await page.screenshot());
    await browser.close();
    console.log(`wrote ${OUT}`);
  } finally {
    server.kill();
  }
}

await main();
