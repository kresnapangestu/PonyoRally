import { FORMAT_RULES } from "@/constants/formats";
import { getMatchStatus } from "./scoring";
import type { ID, Player, Side, Team, Tournament } from "./types";

/**
 * Standings are always recalculated from match history, never stored.
 *
 * Order: points ↓, point difference ↓, wins ↓, byes ↑, then name and ID.
 * Entries equal on the first four share a rank; name/ID only fix the order
 * they are listed in, so the list is deterministic.
 */

export type RankCriterion = "points" | "diff" | "wins" | "byes";

export interface StandingRow {
  /** Player ID, or team ID in fixed-team formats. */
  id: ID;
  name: string;
  points: number;
  conceded: number;
  diff: number;
  wins: number;
  draws: number;
  played: number;
  byes: number;
  rank: number;
  /** Shares its rank with the row above. */
  tied: boolean;
  /** The criterion that placed this row below the one above; null if first or tied. */
  separatedBy: RankCriterion | null;
  withdrawn: boolean;
}

type Tally = Omit<StandingRow, "rank" | "tied" | "separatedBy">;

const RANK_CRITERIA: { key: RankCriterion; compare: (a: Tally, b: Tally) => number }[] = [
  { key: "points", compare: (a, b) => b.points - a.points },
  { key: "diff", compare: (a, b) => b.diff - a.diff },
  { key: "wins", compare: (a, b) => b.wins - a.wins },
  { key: "byes", compare: (a, b) => a.byes - b.byes },
];

// Fixed locale so ordering never changes with the UI language.
const nameCollator = new Intl.Collator("id", { sensitivity: "base", numeric: true });

export function teamName(team: Team, playersById: Map<ID, Player>) {
  return team.players.map((id) => playersById.get(id)?.name ?? "?").join(" & ");
}

function emptyTally(id: ID, name: string, withdrawn: boolean): Tally {
  return { id, name, points: 0, conceded: 0, diff: 0, wins: 0, draws: 0, played: 0, byes: 0, withdrawn };
}

function createTallies(t: Tournament): Map<ID, Tally> {
  const playersById = new Map(t.players.map((p) => [p.id, p]));
  const tallies = new Map<ID, Tally>();

  if (FORMAT_RULES[t.format].fixedTeams) {
    for (const team of t.teams ?? []) {
      const withdrawn = team.players.some((id) => playersById.get(id)?.status === "withdrawn");
      tallies.set(team.id, emptyTally(team.id, teamName(team, playersById), withdrawn));
    }
  } else {
    for (const p of t.players) {
      tallies.set(p.id, emptyTally(p.id, p.name, p.status === "withdrawn"));
    }
  }
  return tallies;
}

/** Who collects a side's points: its team, or each player on it. */
function entriesOf(side: Side, fixedTeams: boolean): ID[] {
  if (fixedTeams) return side.t ? [side.t] : [];
  return side.p;
}

function compareTallies(a: Tally, b: Tally) {
  for (const { compare } of RANK_CRITERIA) {
    const result = compare(a, b);
    if (result !== 0) return result;
  }
  return nameCollator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function firstDifference(a: Tally, b: Tally): RankCriterion | null {
  return RANK_CRITERIA.find(({ compare }) => compare(a, b) !== 0)?.key ?? null;
}

export function computeStandings(
  t: Tournament,
  { throughRound = t.rounds.length }: { throughRound?: number } = {},
): StandingRow[] {
  const fixedTeams = FORMAT_RULES[t.format].fixedTeams;
  const tallies = createTallies(t);

  for (const round of t.rounds.slice(0, throughRound)) {
    for (const id of round.byes) {
      const tally = tallies.get(id);
      if (tally) tally.byes += 1;
    }

    for (const match of round.matches) {
      if (getMatchStatus(match) !== "complete" || !match.s) continue;
      const sides = [match.a, match.b] as const;

      sides.forEach((side, index) => {
        const scored = match.s![index];
        const conceded = match.s![1 - index];
        for (const id of entriesOf(side, fixedTeams)) {
          const tally = tallies.get(id);
          if (!tally) continue; // e.g. a guest substitute in a team format
          tally.points += scored;
          tally.conceded += conceded;
          tally.played += 1;
          if (scored > conceded) tally.wins += 1;
          if (scored === conceded) tally.draws += 1;
        }
      });
    }
  }

  const sorted = [...tallies.values()]
    .map((tally) => ({ ...tally, diff: tally.points - tally.conceded }))
    .sort(compareTallies);

  const rows: StandingRow[] = [];
  sorted.forEach((tally, index) => {
    const above = rows[index - 1];
    const separatedBy = above ? firstDifference(above, tally) : null;
    const tied = Boolean(above) && separatedBy === null;
    rows.push({
      ...tally,
      rank: tied ? above.rank : index + 1,
      tied,
      separatedBy,
    });
  });
  return rows;
}
