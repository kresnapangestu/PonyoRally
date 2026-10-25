"use client";

import { useMemo } from "react";
import { usePrefsStore } from "@/store/prefs-store";
import { translate, translatePlural } from "./translate";
import type { PluralKey, TranslationKey, TranslationVars } from "./types";

/** `t` for plain text, `tp` for count-dependent text ("1 player" / "2 players"). */
export function useT() {
  const lang = usePrefsStore((s) => s.lang);
  return useMemo(
    () => ({
      lang,
      t: (key: TranslationKey, vars?: TranslationVars) => translate(lang, key, vars),
      tp: (key: PluralKey, count: number, vars?: TranslationVars) => translatePlural(lang, key, count, vars),
    }),
    [lang],
  );
}

export type Translator = ReturnType<typeof useT>;
