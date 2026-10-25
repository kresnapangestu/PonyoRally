import { create } from "zustand";
import {
  addLatePlayer,
  clearScore,
  createTournament,
  finishTournament,
  generateNextRound,
  redoLastRound,
  renamePlayer,
  renameTournament,
  reopenTournament,
  setAvailability,
  setPlayerStatus,
  setScore,
  skipMatch,
  substitute,
  swapPlayers,
  unskipMatch,
  type CreateResult,
  type MatchRef,
  type OpResult,
  type ScoreDecision,
  type SubstituteInput,
} from "@/domain/operations";
import type { RoundNote } from "@/domain/engine";
import type { Gender, ID, Player, Score, Tournament } from "@/domain/types";
import type { SetupDraft } from "@/domain/validation/setup";
import { createId, createSeed } from "@/lib/id";
import { getRepository } from "@/persistence/instance";

/**
 * The open tournament. Every action runs a pure domain operation, saves the
 * result, then updates state. If saving fails (e.g. storage full) the change
 * stays in memory and `saveError` tells the UI to warn the host.
 */

type LoadState = "idle" | "ready" | "notFound" | "corrupt" | "newerVersion";

interface TournamentState {
  tournament: Tournament | null;
  loadState: LoadState;
  saveError: "quota" | "unknown" | null;
  /** Set when another tab changed this tournament and we reloaded it. */
  changedElsewhere: boolean;
  /** Notes from the most recent round generation (repeats, empty courts). */
  lastRoundNotes: RoundNote[];

  open: (id: ID) => void;
  create: (draft: SetupDraft) => CreateResult;
  reloadIfChanged: () => void;
  dismissChangedElsewhere: () => void;

  setScore: (ref: MatchRef, score: Score) => OpResult<string>;
  clearScore: (ref: MatchRef) => OpResult<string>;
  skipMatch: (ref: MatchRef) => OpResult<string>;
  unskipMatch: (ref: MatchRef) => OpResult<string>;
  substitute: (ref: MatchRef, input: SubstituteInput) => OpResult<string>;
  swapPlayers: (round: number, a: ID, b: ID, decision?: ScoreDecision) => OpResult<string>;
  setAvailability: (playerId: ID, available: boolean) => OpResult<string>;
  /** Returns the new player's ID so the caller can put them straight into a match. */
  addLatePlayer: (name: string, gender?: Gender) => OpResult<string> & { playerId: ID };
  setPlayerStatus: (playerId: ID, status: Player["status"]) => OpResult<string>;
  renamePlayer: (playerId: ID, name: string) => OpResult<string>;
  generateNextRound: (expectedRounds: number) => OpResult<string>;
  redoLastRound: () => OpResult<string>;
  finish: () => OpResult<string>;
  reopen: () => OpResult<string>;
  rename: (name: string) => OpResult<string>;
}

const NO_TOURNAMENT = { ok: false, error: "noTournament" } as const;

export const useTournamentStore = create<TournamentState>()((set, get) => {
  /** Runs an operation on the open tournament and persists the result. */
  function commit<E extends string>(
    operation: (t: Tournament) => OpResult<E> & { notes?: RoundNote[] },
  ): OpResult<E | "noTournament"> {
    const current = get().tournament;
    if (!current) return NO_TOURNAMENT;

    const result = operation(current);
    if (!result.ok) return result;

    const saved = getRepository().save(result.tournament);
    set({
      tournament: saved.ok ? saved.tournament : result.tournament,
      saveError: saved.ok ? null : saved.reason,
      ...(result.notes ? { lastRoundNotes: result.notes } : {}),
    });
    return result;
  }

  return {
    tournament: null,
    loadState: "idle",
    saveError: null,
    changedElsewhere: false,
    lastRoundNotes: [],

    open(id) {
      const result = getRepository().load(id);
      set(
        result.ok
          ? { tournament: result.tournament, loadState: "ready", changedElsewhere: false, lastRoundNotes: [] }
          : { tournament: null, loadState: result.reason },
      );
    },

    create(draft) {
      const now = Date.now();
      const result = createTournament({ draft, id: createId(), seed: createSeed(), now, createId });
      if (!result.ok) return result;

      const saved = getRepository().save(result.tournament);
      set({
        tournament: saved.ok ? saved.tournament : result.tournament,
        loadState: "ready",
        saveError: saved.ok ? null : saved.reason,
        changedElsewhere: false,
        lastRoundNotes: result.notes,
      });
      return result;
    },

    reloadIfChanged() {
      const current = get().tournament;
      if (!current) return;
      const result = getRepository().load(current.id);
      if (result.ok && result.tournament.updatedAt !== current.updatedAt) {
        set({ tournament: result.tournament, changedElsewhere: true });
      }
    },
    dismissChangedElsewhere: () => set({ changedElsewhere: false }),

    setScore: (ref, score) => commit((t) => setScore(t, ref, score)),
    clearScore: (ref) => commit((t) => clearScore(t, ref)),
    skipMatch: (ref) => commit((t) => skipMatch(t, ref)),
    unskipMatch: (ref) => commit((t) => unskipMatch(t, ref)),
    substitute: (ref, input) => commit((t) => substitute(t, ref, input)),
    swapPlayers: (round, a, b, decision) => commit((t) => swapPlayers(t, round, a, b, decision)),
    setAvailability: (playerId, available) => commit((t) => setAvailability(t, playerId, available)),
    addLatePlayer: (name, gender) => {
      const playerId = createId();
      return { ...commit((t) => addLatePlayer(t, { id: playerId, name, gender })), playerId };
    },
    setPlayerStatus: (playerId, status) => commit((t) => setPlayerStatus(t, playerId, status)),
    renamePlayer: (playerId, name) => commit((t) => renamePlayer(t, playerId, name)),
    generateNextRound: (expectedRounds) => commit((t) => generateNextRound(t, expectedRounds)),
    redoLastRound: () => commit(redoLastRound),
    finish: () => commit(finishTournament),
    reopen: () => commit(reopenTournament),
    rename: (name) => commit((t) => renameTournament(t, name)),
  };
});
