"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTournamentStore } from "@/store/tournament-store";

/** Loads the tournament named in ?id= from storage into the store. */
export function useOpenTournament() {
  const id = useSearchParams().get("id");
  const open = useTournamentStore((s) => s.open);
  const tournament = useTournamentStore((s) => s.tournament);
  const loadState = useTournamentStore((s) => s.loadState);

  useEffect(() => {
    if (id && tournament?.id !== id) open(id);
  }, [id, tournament?.id, open]);

  const matchesUrl = tournament !== null && tournament.id === id;
  return { tournament: matchesUrl ? tournament : null, loadState: id ? loadState : "notFound" };
}
