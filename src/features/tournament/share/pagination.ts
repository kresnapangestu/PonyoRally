import { CARD_LAYOUT, type CardLayout } from "./card-layout";

/** How many ranking rows fit on one card at readable size. */
export function pageCapacity(layout: Pick<CardLayout, "rowsTop" | "rowsBottom" | "rowHeight" | "rowGap"> = CARD_LAYOUT) {
  const slot = layout.rowHeight + layout.rowGap;
  // The last row needs no gap after it.
  return Math.max(1, Math.floor((layout.rowsBottom - layout.rowsTop + layout.rowGap) / slot));
}

/**
 * Splits entries into pages in their existing order. Deterministic: the same
 * entries and capacity always give the same page boundaries; nothing is
 * dropped, duplicated or re-sorted.
 */
export function paginate<T>(entries: readonly T[], perPage: number): T[][] {
  if (perPage < 1) throw new Error("perPage must be at least 1");
  const pages: T[][] = [];
  for (let start = 0; start < entries.length; start += perPage) pages.push(entries.slice(start, start + perPage));
  return pages;
}
