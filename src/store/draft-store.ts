import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import type { FormatId, Gender, ID, PlayMode, ScoringMode } from "@/domain/types";
import { createId } from "@/lib/id";
import {
  emptyDraft,
  withCourtCount,
  withCourtName,
  withFormat,
  withMinimumRows,
  withPair,
  withPlayerChanged,
  withPlayerRemoved,
  withPlayersAdded,
  withRemainingPaired,
  withoutPair,
  type Draft,
} from "./draft";

/** Persisted so a refresh or language switch never loses a half-filled form. */
interface DraftState extends Draft {
  setStep: (step: number) => void;
  setFormat: (format: FormatId) => void;
  setName: (name: string) => void;
  setMode: (mode: PlayMode) => void;
  setCourtCount: (count: number) => void;
  setCourtName: (index: number, name: string) => void;
  setScoring: (scoring: ScoringMode) => void;
  setTargetPoints: (points: number | null) => void;
  addPlayers: (names: string[]) => void;
  updatePlayer: (id: ID, change: { name?: string; gender?: Gender }) => void;
  removePlayer: (id: ID) => void;
  pair: (a: ID, b: ID) => void;
  unpair: (teamIndex: number) => void;
  pairRemaining: (shuffle: <T>(items: T[]) => T[]) => void;
  reset: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      ...emptyDraft(createId),
      setStep: (step) => set({ step }),
      setFormat: (format) => set((d) => withMinimumRows(withFormat(d, format), createId)),
      setName: (name) => set({ name }),
      setMode: (mode) => set((d) => withMinimumRows({ ...d, mode }, createId)),
      setCourtCount: (count) => set((d) => withCourtCount(d, count)),
      setCourtName: (index, name) => set((d) => withCourtName(d, index, name)),
      setScoring: (scoring) => set({ scoring }),
      setTargetPoints: (targetPoints) => set({ targetPoints }),
      addPlayers: (names) => set((d) => withPlayersAdded(d, names, createId)),
      updatePlayer: (id, change) => set((d) => withPlayerChanged(d, id, change)),
      removePlayer: (id) => set((d) => withMinimumRows(withPlayerRemoved(d, id), createId)),
      pair: (a, b) => set((d) => withPair(d, a, b)),
      unpair: (teamIndex) => set((d) => withoutPair(d, teamIndex)),
      pairRemaining: (shuffle) => set((d) => withRemainingPaired(d, shuffle)),
      reset: () => set(emptyDraft(createId)),
    }),
    {
      name: STORAGE_KEYS.draft,
      version: 2,
      // v1 drafts had a preset total; start the scoring choice fresh.
      migrate: (persisted) => ({ ...emptyDraft(createId), ...(persisted as Partial<Draft>), scoring: "race", targetPoints: null }),
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Draft => ({
        step: s.step,
        format: s.format,
        name: s.name,
        mode: s.mode,
        courtCount: s.courtCount,
        courtNameOverrides: s.courtNameOverrides,
        scoring: s.scoring,
        targetPoints: s.targetPoints,
        players: s.players,
        teams: s.teams,
      }),
    },
  ),
);
