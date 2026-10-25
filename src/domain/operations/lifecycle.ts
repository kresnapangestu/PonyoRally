import { NAME_MAX_LENGTH } from "@/constants/limits";
import type { Tournament } from "../types";
import { failure, success, type OpResult } from "./result";

export function finishTournament(t: Tournament): OpResult<never> {
  return success({ ...t, status: "finished" });
}

export function reopenTournament(t: Tournament): OpResult<never> {
  return success({ ...t, status: "active" });
}

export function renameTournament(t: Tournament, name: string): OpResult<"nameRequired" | "nameTooLong"> {
  const trimmed = name.trim();
  if (!trimmed) return failure("nameRequired");
  if (trimmed.length > NAME_MAX_LENGTH.game) return failure("nameTooLong");
  return success({ ...t, name: trimmed });
}
