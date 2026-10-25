"use client";

import { EllipsisVerticalIcon, ListBulletIcon, TrophyIcon, UsersIcon } from "@heroicons/react/24/outline";
import {
  ListBulletIcon as ListBulletSolid,
  TrophyIcon as TrophySolid,
  UsersIcon as UsersSolid,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonStyles } from "@/components/ui/button-styles";
import { Notice } from "@/components/ui/Notice";
import { TabBar } from "@/components/ui/TabBar";
import { TopBar } from "@/components/ui/TopBar";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n/useT";
import { LeaderboardTab } from "./leaderboard/LeaderboardTab";
import { MatchesTab } from "./matches/MatchesTab";
import { NextRoundBar } from "./matches/NextRoundBar";
import { PlayersTab } from "./players/PlayersTab";
import { TournamentSheets } from "./TournamentSheets";
import { useTournamentScreen, type TournamentScreenModel } from "./useTournamentScreen";

export function TournamentScreen() {
  const { t } = useT();
  const model = useTournamentScreen();

  if (!model.tournament) {
    if (model.loadState === "idle") return null;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-lg font-bold">{t("tournament.notFound")}</p>
        <Link href={ROUTES.home} className={buttonStyles({ variant: "secondary" })}>
          {t("tournament.backHome")}
        </Link>
      </main>
    );
  }
  return <TournamentView model={model as TournamentScreenModel} />;
}

function TournamentView({ model }: { model: TournamentScreenModel }) {
  const { t } = useT();
  const router = useRouter();
  const { tournament, tab } = model;

  return (
    <>
      <TopBar
        title={tournament.name}
        subtitle={t("tournament.subtitle", {
          format: t(`formats.${tournament.format}.name`),
          n: tournament.rounds.length,
        })}
        onBack={() => router.push(ROUTES.home)}
        backLabel={t("common.back")}
        actions={
          <button
            type="button"
            onClick={() => model.openSheet({ kind: "tournamentMenu" })}
            aria-label={t("tournament.menu.open")}
            className="grid size-12 place-items-center rounded-button text-text-muted active:bg-surface-2"
          >
            <EllipsisVerticalIcon className="size-6" aria-hidden="true" />
          </button>
        }
      />

      <main key={tab} className="flex flex-1 animate-fade-in flex-col gap-3 px-4 pt-2 pb-6">
        {model.saveError && <Notice tone="error">{t(`storage.${model.saveError}`)}</Notice>}
        {model.changedElsewhere && (
          <Notice
            tone="info"
            action={
              <button type="button" onClick={model.dismissChangedElsewhere} className="text-sm font-semibold text-primary-soft">
                {t("common.close")}
              </button>
            }
          >
            {t("tournament.changedElsewhere")}
          </Notice>
        )}
        {model.finished && <Notice tone="info">{t("tournament.finishedBanner")}</Notice>}

        {tab === "matches" && <MatchesTab model={model} />}
        {tab === "leaderboard" && <LeaderboardTab model={model} />}
        {tab === "players" && <PlayersTab model={model} />}
      </main>

      <div className="sticky bottom-0 z-20">
        {tab === "matches" && !model.finished && <NextRoundBar model={model} />}
        <TabBar
          label={t("tournament.tabsLabel")}
          items={[
            {
              key: "matches",
              label: t("tournament.tabs.matches"),
              icon: ListBulletIcon,
              activeIcon: ListBulletSolid,
              active: tab === "matches",
              onClick: () => model.setTab("matches"),
            },
            {
              key: "leaderboard",
              label: t("tournament.tabs.leaderboard"),
              icon: TrophyIcon,
              activeIcon: TrophySolid,
              active: tab === "leaderboard",
              onClick: () => model.setTab("leaderboard"),
            },
            {
              key: "players",
              label: t("tournament.tabs.players"),
              icon: UsersIcon,
              activeIcon: UsersSolid,
              active: tab === "players",
              onClick: () => model.setTab("players"),
            },
          ]}
        />
      </div>

      <TournamentSheets model={model} />
    </>
  );
}
