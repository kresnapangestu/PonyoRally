/**
 * The small slice of a key-value store the repository needs. localStorage in
 * the app; an in-memory map in tests (or if the browser blocks storage).
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  /** Throws on quota errors; the repository turns that into a result. */
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    keys: () => [...map.keys()],
  };
}

function localStorageAvailable() {
  try {
    const probe = "__ponyo_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * localStorage, or memory if it is blocked (e.g. some private modes).
 * `persistent` tells the UI whether data will survive a reload.
 */
export function browserStorage(): { storage: KeyValueStorage; persistent: boolean } {
  if (typeof window === "undefined" || !localStorageAvailable()) {
    return { storage: memoryStorage(), persistent: false };
  }
  const ls = window.localStorage;
  return {
    persistent: true,
    storage: {
      getItem: (key) => ls.getItem(key),
      setItem: (key, value) => ls.setItem(key, value),
      removeItem: (key) => ls.removeItem(key),
      keys: () => Array.from({ length: ls.length }, (_, i) => ls.key(i)).filter((k): k is string => k !== null),
    },
  };
}

export function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}
