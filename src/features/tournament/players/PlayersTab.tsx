"use client";

import { PencilSquareIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { FORMAT_RULES } from "@/constants/formats";
import { getMatchStatus } from "@/domain/scoring";
import type { ID, Player, Tournament } from "@/domain/types";
import { useT } from "@/i18n/useT";
import { useTournamentStore } from "@/store/tournament-store";
import { opErrorMessage } from "../op-error";
import type { TournamentScreenModel } from "../useTournamentScreen";
import { PlayerNameSheet } from "./PlayerNameSheet";

type NextRoundStatus = "play" | "out" | "left";

function statusOf(player: Player, t: Tournament): NextRoundStatus {
  if (player.status === "withdrawn") return "left";
  return t.pendingOut?.includes(player.id) ? "out" : "play";
}

/** Completed games only, so it matches "played" on the leaderboard. */
function playedCount(t: Tournament, id: ID) {
  return t.rounds.reduce(
    (sum, r) =>
      sum + r.matches.filter((m) => getMatchStatus(m) === "complete" && (m.a.p.includes(id) || m.b.p.includes(id))).length,
    0,
  );
}

export function PlayersTab({ model }: { model: TournamentScreenModel }) {
  const translator = useT();
  const { t, tp } = translator;
  const { tournament, names, finished } = model;
  const store = useTournamentStore.getState();
  const [editing, setEditing] = useState<{ kind: "add" } | { kind: "rename"; id: ID } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setStatus = (player: Player, next: NextRoundStatus) => {
    if (next === "left") return store.setPlayerStatus(player.id, "withdrawn");
    if (player.status === "withdrawn") store.setPlayerStatus(player.id, "active");
    store.setAvailability(player.id, next === "play");
  };

  const closeSheet = () => {
    setEditing(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-text-muted">{t("tournament.players.nextRound")}</p>
      <ul className="flex flex-col gap-2">
        {tournament.players.map((player, i) => (
          <li
            key={player.id}
            className="flex animate-step-in items-center gap-2 rounded-card bg-surface py-2 pr-2 pl-1 shadow-card"
            style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
          >
            <button
              type="button"
              disabled={finished}
              onClick={() => setEditing({ kind: "rename", id: player.id })}
              aria-label={t("tournament.players.rename", { name: names.player(player.id) })}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-button px-2 text-left active:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-semibold ${player.status === "withdrawn" ? "text-text-muted line-through" : ""}`}>
                  {names.player(player.id)}
                </span>
                <span className="block text-xs text-text-muted">
                  {tp("tournament.leaderboard.playedCount", playedCount(tournament, player.id))}
                  {player.joinedRound > 0 && <> · {t("tournament.players.lateJoiner", { n: player.joinedRound + 1 })}</>}
                </span>
              </span>
              {!finished && <PencilSquareIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />}
            </button>
            <div className="w-[176px] shrink-0">
              <Segmented<NextRoundStatus>
                label={t("tournament.players.statusOf", { name: names.player(player.id) })}
                hideLabel
                compact
                value={statusOf(player, tournament)}
                onChange={(next) => setStatus(player, next)}
                options={[
                  { value: "play", label: t("tournament.players.play"), disabled: finished },
                  { value: "out", label: t("tournament.players.sitOut"), disabled: finished },
                  { value: "left", label: t("tournament.players.withdrawn"), disabled: finished },
                ]}
              />
            </div>
          </li>
        ))}
      </ul>

      {!finished && (
        <Button variant="secondary" block onClick={() => setEditing({ kind: "add" })}>
          <UserPlusIcon className="size-5" aria-hidden="true" />
          {t("tournament.players.add")}
        </Button>
      )}

      {editing?.kind === "add" && (
        <PlayerNameSheet
          title={t("tournament.players.addTitle")}
          hint={t("tournament.players.addHint")}
          askGender={FORMAT_RULES[tournament.format].needsGender}
          error={error}
          onClose={closeSheet}
          onSave={(name, gender) => {
            const result = store.addLatePlayer(name, gender);
            if (!result.ok) return setError(opErrorMessage(result.error, translator));
            closeSheet();
          }}
        />
      )}
      {editing?.kind === "rename" && (
        <PlayerNameSheet
          title={t("tournament.players.renameTitle")}
          initialName={tournament.players.find((p) => p.id === editing.id)?.name}
          askGender={false}
          error={error}
          onClose={closeSheet}
          onSave={(name) => {
            const result = store.renamePlayer(editing.id, name);
            if (!result.ok) return setError(opErrorMessage(result.error, translator));
            closeSheet();
          }}
        />
      )}
    </div>
  );
}
