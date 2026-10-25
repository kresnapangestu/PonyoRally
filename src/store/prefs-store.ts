import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import type { Language } from "@/i18n/languages";
import { DEFAULT_LANGUAGE } from "@/i18n/languages";
import type { ThemePreference } from "@/theme/theme";

interface PrefsState {
  lang: Language;
  theme: ThemePreference;
  setLang: (lang: Language) => void;
  setTheme: (theme: ThemePreference) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANGUAGE,
      theme: "system",
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: STORAGE_KEYS.prefs,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lang, theme }) => ({ lang, theme }),
    },
  ),
);
