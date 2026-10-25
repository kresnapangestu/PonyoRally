import { FORMAT_RULES } from "@/constants/formats";
import { isRoundResolved } from "../scoring";
import type { FormatId, ID, Player, Tournament } from "../types";
import { americano } from "./formats/americano";
import { mexicano } from "./formats/mexicano";
import { mixAmericano } from "./formats/mixAmericano";
import { mixicano } from "./formats/mixicano";
import { teamAmericano } from "./formats/teamAmericano";
import { teamMexicano } from "./formats/teamMexicano";
import { buildHistory } from "./shared/history";
import { createRng, hashSeed, shuffle } from "./shared/rng";
import type { EngineContext, FormatEngine, GenerateResult } from "./types";

export type { GenerateResult, InfeasibleReason, RoundNote } from "./types";

const ENGINES: Record<FormatId, FormatEngine> = {
  americano,
  teamAmericano,
  mexicano,
  teamMexicano,
  mixicano,
  mixAmericano,
};

/** Salt for the tournament-wide order that round-robin schedules rotate. */
const ORDER_SALT = 0x0c1c1e;

export interface GenerateOptions {
  /** Defaults to the next round; pass the last index to redo it. */
  roundIndex?: number;
  attempt?: number;
  /** Players marked unavailable for this round. */
  out?: ID[];
}

function isAvailable(player: Player, roundIndex: number, out: ReadonlySet<ID>) {
  return player.status === "active" && player.joinedRound <= roundIndex && !out.has(player.id);
}

function createStableOrder(t: Tournament) {
  const allIds = [...t.players.map((p) => p.id), ...(t.teams ?? []).map((team) => team.id)];
  const rank = new Map(shuffle(allIds, createRng(hashSeed(t.seed, ORDER_SALT))).map((id, i) => [id, i]));
  return (ids: readonly ID[]) => [...ids].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}

/**
 * Generates one round for any format. Pure: same tournament + options always
 * gives the same round. The caller stores the result.
 */
export function generateRound(t: Tournament, options: GenerateOptions = {}): GenerateResult {
  const { roundIndex = t.rounds.length, attempt = 0, out = [] } = options;

  if (t.status === "finished") return { ok: false, reason: "tournamentFinished" };
  const previous = t.rounds[roundIndex - 1];
  if (previous && !isRoundResolved(previous.matches)) {
    return { ok: false, reason: "previousRoundIncomplete" };
  }

  const engine = ENGINES[t.format];
  const outSet = new Set(out);
  const players = t.players.filter((p) => isAvailable(p, roundIndex, outSet));
  const availableIds = new Set(players.map((p) => p.id));
  const fixedTeams = FORMAT_RULES[t.format].fixedTeams;

  const previousRounds = t.rounds.slice(0, roundIndex);
  const redos = previousRounds.reduce((sum, round) => sum + round.attempt, attempt);

  const ctx: EngineContext = {
    t,
    roundIndex,
    rotation: roundIndex + redos,
    players,
    teams: (t.teams ?? []).filter((team) => team.players.every((id) => availableIds.has(id))),
    history: buildHistory(previousRounds, fixedTeams ? "team" : "player"),
    rng: createRng(hashSeed(t.seed, roundIndex, attempt)),
    stableOrder: createStableOrder(t),
  };

  const result = engine.generate(ctx);
  if (!result.ok) return result;
  return { ok: true, notes: result.notes, round: { ...result.round, out: [...out], attempt } };
}
