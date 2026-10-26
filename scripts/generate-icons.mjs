// Generates the app / home-screen icons from the court logo.
// Run after changing the logo: node scripts/generate-icons.mjs
// Uses sharp, which ships with Next.js.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#06402B";
const LOGO = "public/brand/court.webp";
const FAVICON = "public/brand/favicon-ponyo.png";

/** Logo centered on a brand-green square; `fill` is the logo width as a share of the icon. */
async function icon(size, fill, out) {
  const logo = await sharp(LOGO).resize({ width: Math.round(size * fill) }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BRAND } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await mkdir("public/icons", { recursive: true });
await icon(192, 0.78, "public/icons/icon-192.png");
await icon(512, 0.78, "public/icons/icon-512.png");
// Maskable icons get cropped to a circle on Android: keep the logo inside the safe zone.
await icon(512, 0.6, "public/icons/maskable-512.png");
await icon(180, 0.78, "src/app/apple-icon.png");

// Browser-tab favicon: the tennis-ball logo, squared on a transparent background.
await sharp(FAVICON)
  .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile("src/app/icon.png");
console.log("wrote src/app/icon.png");
