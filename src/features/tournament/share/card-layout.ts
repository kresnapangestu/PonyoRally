/**
 * Geometry of the share card, in output pixels. Pagination reads the row area
 * from here, so page capacity always matches what the renderer can draw.
 */
export const CARD_LAYOUT = {
  width: 1080,
  height: 1350,
  margin: 72,
  /** First row's top edge (below brand, title, subtitle and column labels). */
  rowsTop: 448,
  /** Last row must end above the footer. */
  rowsBottom: 1206,
  rowHeight: 74,
  rowGap: 8,
} as const;

export type CardLayout = typeof CARD_LAYOUT;
