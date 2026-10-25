import type { SetupIssue } from "@/domain/validation/setup";
import type { Translator } from "@/i18n/useT";

/** Turns a validation issue into a sentence in the current language. */
export function issueMessage(issue: SetupIssue, { t, tp }: Translator): string {
  const params = issue.params ?? {};
  const count = params.count ?? 0;

  switch (issue.code) {
    case "genderMissing":
    case "unpairedPlayers":
    case "byesPerRound":
    case "teamByesPerRound":
    case "emptyCourts":
    case "fewTeams":
      return tp(`validation.${issue.code}`, count);
    case "mixedByesPerRound": {
      const parts = [
        params.men ? tp("validation.men", params.men) : null,
        params.women ? tp("validation.women", params.women) : null,
      ].filter(Boolean);
      return t("validation.mixedByesPerRound", { list: parts.join(` ${t("validation.and")} `) });
    }
    default:
      return t(`validation.${issue.code}`, params);
  }
}
