import { en } from "./dictionaries/en";
import { id } from "./dictionaries/id";
import type { Language } from "./languages";
import type { Dictionary, PluralKey, TranslationKey, TranslationVars } from "./types";

const DICTIONARIES: Record<Language, Dictionary> = { id, en };

/** Replaces {name} placeholders; unknown placeholders are left visible. */
function interpolate(text: string, vars?: TranslationVars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

function lookup(lang: Language, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], DICTIONARIES[lang]);
}

export function translate(lang: Language, key: TranslationKey, vars?: TranslationVars): string {
  return interpolate(lookup(lang, key) as string, vars);
}

/** Picks the { one, other } form for `count`; {count} is filled in. */
export function translatePlural(
  lang: Language,
  key: PluralKey,
  count: number,
  vars?: TranslationVars,
): string {
  const forms = lookup(lang, key) as { one: string; other: string };
  const form = new Intl.PluralRules(lang).select(count) === "one" ? forms.one : forms.other;
  return interpolate(form, { count, ...vars });
}
