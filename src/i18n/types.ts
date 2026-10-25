import type { id } from "./dictionaries/id";

/** Same tree as the Indonesian dictionary, but any string per leaf. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof id>;

/** Dot paths to every leaf, e.g. "home.newGame". Typos fail to compile. */
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type TranslationKey = Paths<Dictionary>;

/** Nodes shaped { one, other }, picked by count with Intl.PluralRules. */
type PluralPaths<T> = {
  [K in keyof T & string]: T[K] extends { one: string; other: string }
    ? K
    : T[K] extends string
      ? never
      : `${K}.${PluralPaths<T[K]>}`;
}[keyof T & string];
export type PluralKey = PluralPaths<Dictionary>;

export type TranslationVars = Record<string, string | number>;
