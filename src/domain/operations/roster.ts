import { FORMAT_RULES } from "@/constants/formats";
import { NAME_MAX_LENGTH } from "@/constants/limits";
import { cleanName } from "../roster/parse";
import type { Gender, ID, Player, Tournament } from "../types";
import { failure, success, type OpResult } from "./result";

type RosterError = "notFound" | "finished" | "nameRequired" | "nameTooLong" | "genderRequired";

function checkName(name: string): RosterError | null {
  const cleaned = cleanName(name);
  if (!cleaned) return "nameRequired";
  if (cleaned.length > NAME_MAX_LENGTH.player) return "nameTooLong";
  return null;
}

function updatePlayer(t: Tournament, id: ID, change: (p: Player) => Player): Tournament {
  return { ...t, players: t.players.map((p) => (p.id === id ? change(p) : p)) };
}

/** Marks a player as playing or sitting out the next generated round. */
export function setAvailability(t: Tournament, playerId: ID, available: boolean): OpResult<RosterError> {
  if (t.status === "finished") return failure("finished");
  if (!t.players.some((p) => p.id === playerId)) return failure("notFound");

  const out = new Set(t.pendingOut ?? []);
  if (available) out.delete(playerId);
  else out.add(playerId);
  return success({ ...t, pendingOut: [...out] });
}

/**
 * Adds someone who arrived late. They can play from the next round. In
 * fixed-team formats they can only step in as a substitute.
 */
export function addLatePlayer(
  t: Tournament,
  player: { id: ID; name: string; gender?: Gender },
): OpResult<RosterError> {
  if (t.status === "finished") return failure("finished");
  const nameError = checkName(player.name);
  if (nameError) return failure(nameError);
  if (FORMAT_RULES[t.format].needsGender && !player.gender) return failure("genderRequired");

  const added: Player = {
    id: player.id,
    name: cleanName(player.name),
    ...(player.gender ? { gender: player.gender } : {}),
    joinedRound: t.rounds.length,
    status: "active",
  };
  return success({ ...t, players: [...t.players, added] });
}

/** Withdrawn players keep their results but are left out of future rounds. */
export function setPlayerStatus(t: Tournament, playerId: ID, status: Player["status"]): OpResult<RosterError> {
  if (t.status === "finished") return failure("finished");
  if (!t.players.some((p) => p.id === playerId)) return failure("notFound");

  const updated = updatePlayer(t, playerId, (p) => ({ ...p, status }));
  return success({ ...updated, pendingOut: (t.pendingOut ?? []).filter((id) => id !== playerId) });
}

/** Renaming is safe at any time: matches only store player IDs. */
export function renamePlayer(t: Tournament, playerId: ID, name: string): OpResult<RosterError> {
  if (!t.players.some((p) => p.id === playerId)) return failure("notFound");
  const nameError = checkName(name);
  if (nameError) return failure(nameError);
  return success(updatePlayer(t, playerId, (p) => ({ ...p, name: cleanName(name) })));
}
