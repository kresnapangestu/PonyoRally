"use client";

import { useEffect, useState } from "react";
import { SPLASH } from "@/constants/motion";
import { SESSION_KEYS } from "@/constants/storage-keys";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type SplashPhase = "visible" | "leaving" | "hidden";

function hasSeenSplash() {
  try {
    return sessionStorage.getItem(SESSION_KEYS.splashSeen) !== null;
  } catch {
    return false;
  }
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SESSION_KEYS.splashSeen, "1");
  } catch {
    // Storage unavailable (private mode): the splash just plays again.
  }
}

/**
 * Splash timing: hold, fade out, unmount. Plays once per session; on later
 * loads the boot script already hides it with CSS, so it unmounts at once.
 */
export function useSplash() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<SplashPhase>("visible");

  useEffect(() => {
    const seen = hasSeenSplash();
    const hold = seen ? 0 : reducedMotion ? SPLASH.reducedHoldMs : SPLASH.holdMs;
    const exit = seen ? 0 : SPLASH.exitMs;

    const leaveTimer = setTimeout(() => setPhase("leaving"), hold);
    const hideTimer = setTimeout(() => {
      markSplashSeen();
      setPhase("hidden");
    }, hold + exit);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, [reducedMotion]);

  return phase;
}
