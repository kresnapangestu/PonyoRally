"use client";

import { useLayoutEffect } from "react";
import { usePrefsStore } from "@/store/prefs-store";

/** Mirrors the chosen language onto <html lang> for screen readers. */
export function useLangSync() {
  const lang = usePrefsStore((s) => s.lang);

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}
