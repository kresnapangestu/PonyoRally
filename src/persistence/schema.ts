import * as z from "zod/mini";
import { NAME_MAX_LENGTH } from "@/constants/limits";
import { validateScore } from "@/domain/scoring";
import { FORMAT_IDS, SCORING_MODES, type Tournament } from "@/domain/types";

/**
 * Shape check for stored and imported tournaments (current schema version).
 * Data from storage or a backup file is untrusted until it passes this and
 * the integrity check below.
 */

const id = z.string().check(z.minLength(1), z.maxLength(64));
const count = z.number().check(z.int(), z.nonnegative());
const name = (max: number) => z.string().check(z.minLength(1), z.maxLength(max));

const side = z.object({ p: z.array(id), t: z.optional(id) });

const match = z.object({
  court: count,
  a: side,
  b: side,
  s: z.optional(z.tuple([count, count])),
  skipped: z.optional(z.literal(true)),
  subs: z.optional(
    z.array(
      z.object({
        side: z.union([z.literal(0), z.literal(1)]),
        out: id,
        in: id,
        scoreKept: z.boolean(),
      }),
    ),
  ),
});

const tournamentShape = z.object({
  id,
  name: name(NAME_MAX_LENGTH.game),
  format: z.enum(FORMAT_IDS),
  mode: z.enum(["singles", "doubles"]),
  courts: z.array(name(NAME_MAX_LENGTH.court)).check(z.minLength(1)),
  scoring: z.enum(SCORING_MODES),
  targetPoints: z.number().check(z.int(), z.positive()),
  seed: count,
  players: z.array(
    z.object({
      id,
      name: name(NAME_MAX_LENGTH.player),
      gender: z.optional(z.enum(["M", "F"])),
      joinedRound: count,
      status: z.enum(["active", "withdrawn"]),
    }),
  ),
  teams: z.optional(z.array(z.object({ id, players: z.tuple([id, id]) }))),
  rounds: z.array(
    z.object({
      matches: z.array(match),
      byes: z.array(id),
      out: z.array(id),
      attempt: count,
    }),
  ),
  pendingOut: z.optional(z.array(id)),
  plannedRounds: z.optional(count),
  status: z.enum(["active", "finished"]),
  createdAt: count,
  updatedAt: count,
});

/** References that a shape check cannot see: IDs that must exist, courts in range, scores that add up. */
function isConsistent(t: Tournament): boolean {
  const playerIds = new Set(t.players.map((p) => p.id));
  const teamIds = new Set((t.teams ?? []).map((team) => team.id));
  if (playerIds.size !== t.players.length || teamIds.size !== (t.teams ?? []).length) return false;
  if ((t.teams ?? []).some((team) => !team.players.every((p) => playerIds.has(p)))) return false;

  const knownEntry = (entry: string) => playerIds.has(entry) || teamIds.has(entry);
  return t.rounds.every(
    (round) =>
      round.byes.every(knownEntry) &&
      round.out.every((p) => playerIds.has(p)) &&
      round.matches.every(
        (m) =>
          m.court < t.courts.length &&
          [m.a, m.b].every((s) => s.p.every((p) => playerIds.has(p)) && (!s.t || teamIds.has(s.t))) &&
          (!m.s || validateScore(m.s, t) === null),
      ),
  );
}

export function parseTournament(data: unknown): Tournament | null {
  const result = tournamentShape.safeParse(data);
  if (!result.success) return null;
  const tournament = result.data as Tournament;
  return isConsistent(tournament) ? tournament : null;
}
