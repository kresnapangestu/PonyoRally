export const APP_NAME = "Ponyo Rally";

export const LOGO = {
  src: "/brand/court.webp",
  width: 2000,
  height: 1075,
} as const;

/** Full splash artwork (logo + photo); its edges blend into --color-splash. */
export const SPLASH_IMAGE = {
  src: "/brand/splash.webp",
  width: 948,
  height: 1713,
} as const;

/** 404 / "feature not available yet" artwork (text is part of the image). */
export const NOT_FOUND_IMAGE = {
  src: "/brand/not-found.webp",
  width: 948,
  height: 1713,
} as const;

/** Browser chrome color per resolved theme; mirrors --bg in globals.css. */
export const THEME_COLOR = {
  light: "#F5F8F2",
  dark: "#0A1410",
} as const;
