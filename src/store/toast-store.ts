import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface ToastState {
  toast: Toast | null;
  show: (message: string, action?: Toast["action"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** One toast at a time: a newer message replaces the current one. */
export const useToastStore = create<ToastState>()((set) => ({
  toast: null,
  show: (message, action) => set({ toast: { id: nextId++, message, action } }),
  dismiss: (id) => set((s) => (s.toast?.id === id ? { toast: null } : s)),
}));
