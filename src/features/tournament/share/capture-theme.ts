import type { SharePalette } from "./share-snapshot";

/** Light-theme token values, used only if a CSS variable can't be read. */
const FALLBACK: SharePalette = {
  background: "#f5f8f2",
  surface: "#ffffff",
  surfaceAlt: "#eaf1e4",
  border: "#d5e2cc",
  text: "#0e1f17",
  textMuted: "#4b5f53",
  accent: "#06402b",
  brand: "#06402b",
  brandText: "#ffffff",
  brandTextMuted: "rgba(255, 255, 255, 0.72)",
  gold: "#f9f871",
  goldText: "#06402b",
  silver: "#dde3e7",
  silverText: "#2f3a40",
  bronze: "#e7c9a9",
  bronzeText: "#5a3a17",
};

/**
 * Reads the app's current theme and design tokens once, at the start of an
 * export. The card is drawn with these values, so every page of the export
 * keeps the same theme even if the user switches it midway.
 */
export function captureTheme() {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;

  const palette: SharePalette = {
    background: token("--bg", FALLBACK.background),
    surface: token("--surface", FALLBACK.surface),
    surfaceAlt: token("--surface-2", FALLBACK.surfaceAlt),
    border: token("--border", FALLBACK.border),
    text: token("--text", FALLBACK.text),
    textMuted: token("--text-muted", FALLBACK.textMuted),
    accent: token("--primary", FALLBACK.accent),
    brand: token("--brand-surface", FALLBACK.brand),
    // The brand band is green in both themes; same values as --color-on-brand(-muted).
    brandText: FALLBACK.brandText,
    brandTextMuted: FALLBACK.brandTextMuted,
    gold: token("--accent", FALLBACK.gold),
    goldText: token("--accent-fg", FALLBACK.goldText),
    silver: token("--silver", FALLBACK.silver),
    silverText: token("--silver-fg", FALLBACK.silverText),
    bronze: token("--bronze", FALLBACK.bronze),
    bronzeText: token("--bronze-fg", FALLBACK.bronzeText),
  };

  return {
    theme: root.dataset.theme === "dark" ? ("dark" as const) : ("light" as const),
    palette,
    fontFamily: getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
  };
}
