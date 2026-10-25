import {
  ArrowsRightLeftIcon,
  ChartBarIcon,
  HeartIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { FORMAT_RULES } from "@/constants/formats";
import type { FormatId } from "@/domain/types";
import type { TranslationKey } from "@/i18n/types";

/** Display order: the Americano family first, then the ranking-based one. */
export const FORMAT_ORDER: FormatId[] = [
  "americano",
  "teamAmericano",
  "mixAmericano",
  "mexicano",
  "teamMexicano",
  "mixicano",
];

export const FORMAT_ICONS: Record<FormatId, ComponentType<SVGProps<SVGSVGElement>>> = {
  americano: ArrowsRightLeftIcon,
  teamAmericano: UserGroupIcon,
  mixAmericano: HeartIcon,
  mexicano: ChartBarIcon,
  teamMexicano: TrophyIcon,
  mixicano: SparklesIcon,
};

export function formatBadges(format: FormatId): TranslationKey[] {
  const rules = FORMAT_RULES[format];
  return [
    "formats.badges.doubles",
    ...(rules.supportsSingles ? (["formats.badges.singles"] as const) : []),
    ...(rules.needsGender ? (["formats.badges.mixed"] as const) : []),
    ...(rules.fixedTeams ? (["formats.badges.fixedTeams"] as const) : []),
  ];
}
