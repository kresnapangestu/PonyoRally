import type { Translator } from "@/i18n/useT";

const KNOWN = [
  "busy",
  "genderMismatch",
  "unknownPlayer",
  "alreadyInMatch",
  "roundStarted",
  "stale",
  "nameRequired",
  "nameTooLong",
  "genderRequired",
] as const;

const ENGINE = ["notEnoughPlayers", "notEnoughMen", "notEnoughWomen", "previousRoundIncomplete", "tournamentFinished"] as const;

/** Plain-language text for a refused operation. */
export function opErrorMessage(error: string, { t }: Translator): string {
  if ((KNOWN as readonly string[]).includes(error)) return t(`tournament.errors.${error as (typeof KNOWN)[number]}`);
  if ((ENGINE as readonly string[]).includes(error)) return t(`engine.${error as (typeof ENGINE)[number]}`);
  return t("tournament.errors.generic");
}
