import { CARD_LAYOUT as L } from "./card-layout";
import type { ShareEntry, ShareSnapshot } from "./share-snapshot";

/**
 * Draws one share card page onto a canvas and returns it as a PNG blob.
 * Everything is drawn with the snapshot's explicit colors and font, so the
 * output never depends on page styles or browser defaults.
 */

const LOGO_SRC = "/brand/favicon-ponyo.png";
const WEIGHTS = [400, 600, 700, 800];

const COLUMNS = {
  rankX: L.margin + 40,
  nameX: L.margin + 88,
  playedX: L.width - L.margin - 300,
  diffX: L.width - L.margin - 185,
  pointsRight: L.width - L.margin - 26,
};

export interface CardAssets {
  logo: HTMLImageElement | null;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null); // the card still renders, just without the logo
    image.src = src;
  });
}

/** Waits for the app font (all weights the card uses) and the logo. Never throws. */
export async function loadCardAssets(fontFamily: string): Promise<CardAssets> {
  const fonts = WEIGHTS.map((w) => document.fonts.load(`${w} 32px ${fontFamily}`).catch(() => []));
  const [logo] = await Promise.all([loadImage(LOGO_SRC), ...fonts]);
  return { logo };
}

const font = (s: ShareSnapshot, weight: number, size: number) => `${weight} ${size}px ${s.fontFamily}`;

/** Shortens text with "…" until it fits. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth) end--;
  return `${text.slice(0, end).trimEnd()}…`;
}

/** Word-wraps into at most `maxLines`; the last line is ellipsized if needed. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const candidate = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines - 1) {
      line = words.slice(i).join(" ");
      break;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines).map((l, i, all) => (i === all.length - 1 ? ellipsize(ctx, l, maxWidth) : l));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawHeader(ctx: CanvasRenderingContext2D, s: ShareSnapshot, assets: CardAssets, page: number, total: number) {
  const { palette: p, labels } = s;
  const bandHeight = 400;
  ctx.fillStyle = p.brand;
  ctx.fillRect(0, 0, L.width, bandHeight);

  // Brand line: logo + app name, page indicator on the right.
  let textX = L.margin;
  if (assets.logo) {
    ctx.drawImage(assets.logo, L.margin, 56, 76, 76 * (assets.logo.height / assets.logo.width));
    textX += 96;
  }
  ctx.fillStyle = p.brandText;
  ctx.font = font(s, 700, 32);
  ctx.textBaseline = "middle";
  ctx.fillText(labels.appName, textX, 96);

  const pageText = labels.pageOf.replace("{page}", String(page)).replace("{total}", String(total));
  ctx.font = font(s, 800, 24);
  const pillWidth = ctx.measureText(pageText).width + 44;
  roundRect(ctx, L.width - L.margin - pillWidth, 72, pillWidth, 48, 24);
  ctx.fillStyle = p.gold;
  ctx.fill();
  ctx.fillStyle = p.goldText;
  ctx.textAlign = "center";
  ctx.fillText(pageText, L.width - L.margin - pillWidth / 2, 97);
  ctx.textAlign = "left";

  // Card type, tournament name (up to two lines), ranking status.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.brandTextMuted;
  ctx.font = font(s, 700, 22);
  ctx.fillText(labels.kind.toUpperCase(), L.margin, 196);

  ctx.fillStyle = p.brandText;
  ctx.font = font(s, 800, 54);
  wrapLines(ctx, labels.tournamentName, L.width - L.margin * 2, 2).forEach((line, i) => {
    ctx.fillText(line, L.margin, 256 + i * 60);
  });

  ctx.fillStyle = p.brandTextMuted;
  ctx.font = font(s, 400, 26);
  ctx.fillText(ellipsize(ctx, labels.status, L.width - L.margin * 2), L.margin, 372);
}

function drawColumnLabels(ctx: CanvasRenderingContext2D, s: ShareSnapshot) {
  const { columns } = s.labels;
  ctx.fillStyle = s.palette.textMuted;
  ctx.font = font(s, 700, 21);
  ctx.textBaseline = "alphabetic";
  const y = L.rowsTop - 16;
  ctx.textAlign = "center";
  ctx.fillText(columns.rank, COLUMNS.rankX, y);
  ctx.fillText(columns.played, COLUMNS.playedX, y);
  ctx.fillText(columns.diff, COLUMNS.diffX, y);
  ctx.textAlign = "left";
  ctx.fillText(columns.name, COLUMNS.nameX, y);
  ctx.textAlign = "right";
  ctx.fillText(columns.points, COLUMNS.pointsRight, y);
  ctx.textAlign = "left";
}

function medalColors(s: ShareSnapshot, rank: number) {
  const p = s.palette;
  if (rank === 1) return [p.gold, p.goldText];
  if (rank === 2) return [p.silver, p.silverText];
  if (rank === 3) return [p.bronze, p.bronzeText];
  return [p.surfaceAlt, p.textMuted];
}

function drawRow(ctx: CanvasRenderingContext2D, s: ShareSnapshot, entry: ShareEntry, index: number) {
  const p = s.palette;
  const y = L.rowsTop + index * (L.rowHeight + L.rowGap);
  const mid = y + L.rowHeight / 2;

  roundRect(ctx, L.margin, y, L.width - L.margin * 2, L.rowHeight, 20);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.strokeStyle = entry.rank === 1 ? p.accent : p.border;
  ctx.lineWidth = entry.rank === 1 ? 3 : 1.5;
  ctx.stroke();

  // Rank badge (shared rank for ties, exactly as the ranking engine gave it).
  const [badge, badgeText] = medalColors(s, entry.rank);
  ctx.beginPath();
  ctx.arc(COLUMNS.rankX, mid, 25, 0, Math.PI * 2);
  ctx.fillStyle = badge;
  ctx.fill();
  ctx.fillStyle = badgeText;
  ctx.font = font(s, 800, 24);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(entry.rank), COLUMNS.rankX, mid + 1);

  // Name, shortened with "…" only if it would run into the stats.
  ctx.textAlign = "left";
  ctx.font = font(s, 700, 31);
  const suffix = entry.withdrawn ? ` · ${s.labels.withdrawn}` : "";
  const nameWidth = COLUMNS.playedX - 46 - COLUMNS.nameX - (suffix ? ctx.measureText(suffix).width : 0);
  const name = ellipsize(ctx, entry.name, nameWidth);
  ctx.fillStyle = entry.withdrawn ? p.textMuted : p.text;
  ctx.fillText(name, COLUMNS.nameX, mid);
  if (suffix) {
    ctx.fillStyle = p.textMuted;
    ctx.fillText(suffix, COLUMNS.nameX + ctx.measureText(name).width, mid);
  }

  ctx.fillStyle = p.textMuted;
  ctx.font = font(s, 600, 27);
  ctx.textAlign = "center";
  ctx.fillText(String(entry.played), COLUMNS.playedX, mid);
  ctx.fillText(entry.diff > 0 ? `+${entry.diff}` : String(entry.diff), COLUMNS.diffX, mid);

  ctx.fillStyle = p.text;
  ctx.font = font(s, 800, 38);
  ctx.textAlign = "right";
  ctx.fillText(String(entry.points), COLUMNS.pointsRight, mid + 1);
  ctx.textAlign = "left";
}

function drawFooter(ctx: CanvasRenderingContext2D, s: ShareSnapshot) {
  const y = L.height - L.margin + 4;
  ctx.textBaseline = "alphabetic";
  ctx.font = font(s, 600, 22);
  ctx.fillStyle = s.palette.textMuted;
  ctx.fillText(s.labels.footerLeft, L.margin, y);
  ctx.textAlign = "right";
  ctx.fillText(s.labels.footerRight, L.width - L.margin, y);
  ctx.textAlign = "left";
}

export async function renderShareCard(
  snapshot: ShareSnapshot,
  entries: readonly ShareEntry[],
  page: number,
  total: number,
  assets: CardAssets,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = L.width;
  canvas.height = L.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = snapshot.palette.background; // opaque: no transparent PNG background
  ctx.fillRect(0, 0, L.width, L.height);
  drawHeader(ctx, snapshot, assets, page, total);
  drawColumnLabels(ctx, snapshot);
  entries.forEach((entry, i) => drawRow(ctx, snapshot, entry, i));
  drawFooter(ctx, snapshot);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png");
  });
}
