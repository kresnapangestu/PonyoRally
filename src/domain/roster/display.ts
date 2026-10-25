import type { ID, Player } from "../types";
import { nameKey } from "./parse";

/**
 * Names to show on screen. People who share a name are told apart by order
 * of entry: "BUNA", "BUNA 2". Stored names are never changed, so renaming
 * one of them simply removes the number.
 */
export function displayNames(players: readonly Pick<Player, "id" | "name">[]): Map<ID, string> {
  const seen = new Map<string, number>();
  const names = new Map<ID, string>();
  for (const player of players) {
    const key = nameKey(player.name);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    names.set(player.id, count === 1 ? player.name : `${player.name} ${count}`);
  }
  return names;
}
