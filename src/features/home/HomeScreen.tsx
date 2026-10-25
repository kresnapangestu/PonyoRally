"use client";

import { ChevronRightIcon, PlusIcon, TrophyIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonStyles } from "@/components/ui/button-styles";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n/useT";
import { getRepository } from "@/persistence/instance";
import type { TournamentSummary } from "@/persistence/repository";

function GameCard({ game, highlight }: { game: TournamentSummary; highlight: boolean }) {
  const { t } = useT();
  return (
    <Link
      href={ROUTES.tournament(game.id)}
      className={`flex animate-step-in items-center gap-3 rounded-card bg-surface p-4 shadow-card transition-transform duration-120 active:scale-[0.98] ${
        highlight ? "border-2 border-primary" : "border border-border"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-primary-soft uppercase">
          {t(game.status === "active" ? "home.ongoing" : "home.finished")}
        </p>
        <p className="truncate text-lg font-bold">{game.name}</p>
        <p className="text-sm text-text-muted">
          {t(`formats.${game.format}.name`)} · {t("home.roundShort", { n: game.rounds })}
        </p>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
    </Link>
  );
}

export function HomeScreen() {
  const { t } = useT();
  // Home only renders after hydration, so reading storage here is safe.
  const [games] = useState(() => getRepository().list());
  const ongoing = games.filter((g) => g.status === "active");
  const finished = games.filter((g) => g.status === "finished");

  return (
    <>
      <header className="flex items-center px-4 pt-4 pb-2">
        <h1 className="text-primary">
          <Logo label={t("a11y.logo")} className="w-20" />
        </h1>
      </header>

      {games.length === 0 ? (
        <main className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="mb-2 grid size-20 place-items-center rounded-full bg-surface-2 text-primary-soft">
            <TrophyIcon className="size-10" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold">{t("home.emptyTitle")}</h2>
          <p className="max-w-72 text-base text-text-muted">{t("home.emptyBody")}</p>
          <Link href={ROUTES.newGame} className={`${buttonStyles({ size: "lg" })} mt-3`}>
            <PlusIcon className="size-6" aria-hidden="true" />
            {t("home.newGame")}
          </Link>
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
          {ongoing.map((game, i) => (
            <GameCard key={game.id} game={game} highlight={i === 0} />
          ))}
          {finished.length > 0 && (
            <>
              <h2 className="mt-3 text-sm font-semibold text-text-muted">{t("home.finished")}</h2>
              {finished.map((game) => (
                <GameCard key={game.id} game={game} highlight={false} />
              ))}
            </>
          )}
        </main>
      )}
    </>
  );
}
