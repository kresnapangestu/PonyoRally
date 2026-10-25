"use client";

import { useLayoutEffect } from "react";
import { usePrefsStore } from "@/store/prefs-store";
import { applyTheme, DARK_QUERY, resolveTheme } from "./theme";

/**
 * Keeps <html data-theme> in step with the saved preference and, in System
 * mode, with OS changes. The inline head script covers the first paint; this
 * covers later changes and React's dev-mode remount, which clears <html>
 * attributes it does not own.
 */
export function useThemeSync() {
  const preference = usePrefsStore((s) => s.theme);

  useLayoutEffect(() => {
    applyTheme(resolveTheme(preference));
    if (preference !== "system") return;

    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme(resolveTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);
}
