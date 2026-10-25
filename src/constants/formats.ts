import type { FormatId } from "@/domain/types";

export interface FormatRules {
  /** Players register as fixed pairs that never change. */
  fixedTeams: boolean;
  /** Every doubles team must be one man and one woman. */
  needsGender: boolean;
  /** Later rounds are paired from current standings. */
  rankingBased: boolean;
  /** Singles (1 vs 1) is allowed; doubles is always allowed. */
  supportsSingles: boolean;
}

/** The one place format rules live; UI, validation and engines all read it. */
export const FORMAT_RULES: Record<FormatId, FormatRules> = {
  americano: { fixedTeams: false, needsGender: false, rankingBased: false, supportsSingles: true },
  teamAmericano: { fixedTeams: true, needsGender: false, rankingBased: false, supportsSingles: false },
  mexicano: { fixedTeams: false, needsGender: false, rankingBased: true, supportsSingles: true },
  teamMexicano: { fixedTeams: true, needsGender: false, rankingBased: true, supportsSingles: false },
  mixicano: { fixedTeams: false, needsGender: true, rankingBased: true, supportsSingles: false },
  mixAmericano: { fixedTeams: false, needsGender: true, rankingBased: false, supportsSingles: false },
};
