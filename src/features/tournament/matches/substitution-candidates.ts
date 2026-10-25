import { FORMAT_RULES } from "@/constants/formats";
import type { ID, Tournament } from "@/domain/types";

export type CandidateKind = "resting" | "free" | "notPlaying" | "busy";

export interface Candidate {
  id: ID;
  kind: CandidateKind;
  /** For "busy": index of the match they would be swapped from. */
  matchIndex?: number;
}

const ORDER: CandidateKind[] = ["resting", "free", "notPlaying", "busy"];

/**
 * Who can step in for `outId` in a match, best options first: people resting
 * this round, then anyone not playing, then those marked out, and finally
 * players in other matches (that becomes a swap). Mixed formats only offer
 * the same gender.
 */
export function substitutionCandidates(t: Tournament, roundIndex: number, matchIndex: number, outId: ID): Candidate[] {
  const round = t.rounds[roundIndex];
  if (!round) return [];

  const matchOf = new Map<ID, number>();
  round.matches.forEach((m, i) => [...m.a.p, ...m.b.p].forEach((id) => matchOf.set(id, i)));

  // Byes hold team IDs in fixed-team formats; expand them to their players.
  const teamPlayers = new Map((t.teams ?? []).map((team) => [team.id, team.players]));
  const resting = new Set(round.byes.flatMap((id) => teamPlayers.get(id) ?? [id]));
  const out = new Set(round.out);

  const genderOf = new Map(t.players.map((p) => [p.id, p.gender]));
  const sameGender = FORMAT_RULES[t.format].needsGender;

  const candidates: Candidate[] = [];
  for (const player of t.players) {
    if (player.id === outId || player.status !== "active") continue;
    if (sameGender && genderOf.get(player.id) !== genderOf.get(outId)) continue;

    const playingIn = matchOf.get(player.id);
    if (playingIn === matchIndex) continue;
    if (playingIn !== undefined) candidates.push({ id: player.id, kind: "busy", matchIndex: playingIn });
    else if (resting.has(player.id)) candidates.push({ id: player.id, kind: "resting" });
    else if (out.has(player.id)) candidates.push({ id: player.id, kind: "notPlaying" });
    else candidates.push({ id: player.id, kind: "free" });
  }
  return candidates.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}
