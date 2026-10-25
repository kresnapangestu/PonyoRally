"use client";

import { useEffect } from "react";
import { STORAGE_PREFIX } from "@/constants/storage-keys";

/** Calls `onChange` when another tab writes Ponyo Rally data. */
export function useStorageSync(onChange: () => void) {
  useEffect(() => {
    const handle = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) onChange();
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [onChange]);
}
