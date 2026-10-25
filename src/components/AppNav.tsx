"use client";

import { Cog6ToothIcon, HomeIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import {
  Cog6ToothIcon as Cog6ToothSolid,
  HomeIcon as HomeSolid,
  PlusCircleIcon as PlusCircleSolid,
} from "@heroicons/react/24/solid";
import { usePathname } from "next/navigation";
import { TabBar } from "@/components/ui/TabBar";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n/useT";

/** Screens that show the app's bottom navigation. Flows (wizard, tournament) bring their own bars. */
const NAV_SCREENS: readonly string[] = [ROUTES.home, ROUTES.settings];

export function AppNav() {
  const { t } = useT();
  const pathname = usePathname();
  if (!NAV_SCREENS.includes(pathname)) return null;

  return (
    <TabBar
      label={t("nav.label")}
      items={[
        { key: "home", label: t("nav.home"), icon: HomeIcon, activeIcon: HomeSolid, href: ROUTES.home, active: pathname === ROUTES.home },
        { key: "new", label: t("nav.newGame"), icon: PlusCircleIcon, activeIcon: PlusCircleSolid, href: ROUTES.newGame, active: false },
        {
          key: "settings",
          label: t("nav.settings"),
          icon: Cog6ToothIcon,
          activeIcon: Cog6ToothSolid,
          href: ROUTES.settings,
          active: pathname === ROUTES.settings,
        },
      ]}
    />
  );
}
