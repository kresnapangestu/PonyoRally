"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker in production builds only (in
 * development it would cache files that are still changing).
 */
export function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  }, []);
}
