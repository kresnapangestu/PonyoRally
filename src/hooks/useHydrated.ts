import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during server render and hydration, true afterwards. Anything that
 * reads browser-persisted state (language, tournaments) waits for this, so the
 * first client render matches the static HTML exactly.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
