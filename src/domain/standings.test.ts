import { describe, expect, it } from "vitest";
import { doublesMatch, makePlayers, makeTournament, round } from "./__fixtures__/tournament";
import { computeStandings } from "./standings";

const byId = (rows: ReturnType<typeof computeStandings>) =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

describe("computeStandings — individual formats", () => {
  it("credits each player with their team's score", () => {
    const t = makeTournament({
      rounds: [
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"], [14, 10]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], [12, 12], 1),
        ]),
      ],
    });
    const rows = byId(computeStandings(t));

    expect(rows.p1).toMatchObject({ points: 14, conceded: 10, diff: 4, wins: 1, played: 1 });
    expect(rows.p2).toMatchObject({ points: 14, wins: 1 });
    expect(rows.p3).toMatchObject({ points: 10, diff: -4, wins: 0 });
    expect(rows.p5).toMatchObject({ points: 12, draws: 1, wins: 0 });
  });

  it("gives byes zero points and counts them", () => {
    const t = makeTournament({
      players: makePlayers(5),
      rounds: [round([doublesMatch(["p1", "p2"], ["p3", "p4"], [14, 10])], ["p5"])],
    });
    expect(byId(computeStandings(t)).p5).toMatchObject({ points: 0, played: 0, byes: 1 });
  });

  it("ignores pending and skipped matches", () => {
    const t = makeTournament({
      rounds: [
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"]),
          { ...doublesMatch(["p5", "p6"], ["p7", "p8"], [20, 4], 1), skipped: true },
        ]),
      ],
    });
    expect(computeStandings(t).every((r) => r.points === 0 && r.played === 0)).toBe(true);
  });

  it("credits the substitute who actually played", () => {
    const t = makeTournament({
      players: makePlayers(9),
      rounds: [
        round([
          {
            ...doublesMatch(["p9", "p2"], ["p3", "p4"], [14, 10]),
            subs: [{ side: 0, out: "p1", in: "p9", scoreKept: true }],
          },
        ]),
      ],
    });
    const rows = byId(computeStandings(t));
    expect(rows.p9.points).toBe(14);
    expect(rows.p1.points).toBe(0);
  });

  it("only counts rounds up to throughRound", () => {
    const t = makeTournament({
      rounds: [
        round([doublesMatch(["p1", "p2"], ["p3", "p4"], [14, 10])]),
        round([doublesMatch(["p1", "p3"], ["p2", "p4"], [20, 4])]),
      ],
    });
    expect(byId(computeStandings(t, { throughRound: 1 })).p1.points).toBe(14);
    expect(byId(computeStandings(t)).p1.points).toBe(34);
  });
});

describe("computeStandings — tie-breakers", () => {
  it("orders by points, then difference, then wins, then fewer byes", () => {
    const t = makeTournament({
      players: makePlayers(10),
      rounds: [
        // p1/p2: 14 pts, +4. p5/p6: 14 pts, +4 too but via two matches below.
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"], [14, 10]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], [12, 12], 1),
        ], ["p9", "p10"]),
        round([
          doublesMatch(["p9", "p10"], ["p3", "p4"], [16, 8]),
          doublesMatch(["p5", "p7"], ["p6", "p8"], [2, 22], 1),
        ], ["p1", "p2"]),
      ],
    });
    const rows = computeStandings(t);
    const order = rows.map((r) => r.id);

    // p6: 34 pts. p3,p4: 18. p9,p10: 16 pts. p1,p2: 14 pts.
    expect(order[0]).toBe("p6");
    expect(order.indexOf("p9")).toBeLessThan(order.indexOf("p1"));
    expect(rows.find((r) => r.id === "p9")?.separatedBy).toBe("points");
  });

  it("separates equal points by point difference", () => {
    const t = makeTournament({
      players: makePlayers(8),
      rounds: [
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"], [12, 12]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], [12, 12], 1),
        ]),
        round([
          doublesMatch(["p1", "p5"], ["p3", "p7"], [12, 12]),
          doublesMatch(["p2", "p6"], ["p4", "p8"], [12, 12], 1),
        ]),
      ],
      targetPoints: 24,
    });
    // Everyone 24 points, 0 difference, 0 wins, 0 byes → all tied at rank 1.
    const rows = computeStandings(t);
    expect(rows.every((r) => r.rank === 1)).toBe(true);
    expect(rows.slice(1).every((r) => r.tied && r.separatedBy === null)).toBe(true);
  });

  it("uses wins when points and difference are equal", () => {
    const t = makeTournament({
      players: makePlayers(8),
      targetPoints: 20,
      rounds: [
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"], [12, 8]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], [10, 10], 1),
        ]),
        round([
          doublesMatch(["p1", "p3"], ["p2", "p4"], [8, 12]),
          doublesMatch(["p5", "p7"], ["p6", "p8"], [10, 10], 1),
        ]),
      ],
    });
    // p1: 20 pts, diff 0, 1 win.  p5: 20 pts, diff 0, 0 wins.
    const rows = byId(computeStandings(t));
    expect(rows.p1.rank).toBeLessThan(rows.p5.rank);
    expect(rows.p5.separatedBy).toBe("wins");
  });

  it("uses fewer byes when everything else is equal", () => {
    const t = makeTournament({
      players: makePlayers(5),
      courts: ["Court 1"],
      rounds: [
        round([doublesMatch(["p1", "p2"], ["p3", "p4"], [12, 12])], ["p5"]),
        // p4 is marked unavailable (out), which is not a bye.
        { ...round([doublesMatch(["p1", "p2"], ["p3", "p5"], [12, 12])]), out: ["p4"] },
      ],
    });
    // p4 and p5: 12 pts, diff 0, 0 wins each; only p5 had a bye.
    const rows = byId(computeStandings(t));
    expect(rows.p4.rank).toBeLessThan(rows.p5.rank);
    expect(rows.p5.separatedBy).toBe("byes");
  });

  it("gives tied entries the same rank and the next entry a skipped rank", () => {
    const t = makeTournament({
      rounds: [
        round([
          doublesMatch(["p1", "p2"], ["p3", "p4"], [14, 10]),
          doublesMatch(["p5", "p6"], ["p7", "p8"], [13, 11], 1),
        ]),
      ],
    });
    const rows = byId(computeStandings(t));
    expect(rows.p1.rank).toBe(1);
    expect(rows.p2.rank).toBe(1);
    expect(rows.p5.rank).toBe(3);
  });

  it("lists equal entries in a stable name order", () => {
    const t = makeTournament({ players: makePlayers(3).reverse() });
    expect(computeStandings(t).map((r) => r.name)).toEqual(["Player 1", "Player 2", "Player 3"]);
  });
});

describe("computeStandings — fixed teams", () => {
  it("ranks teams and ignores guest substitutes", () => {
    const t = makeTournament({
      format: "teamAmericano",
      teams: [
        { id: "tA", players: ["p1", "p2"] },
        { id: "tB", players: ["p3", "p4"] },
      ],
      rounds: [
        round([
          {
            court: 0,
            a: { p: ["p1", "p9"], t: "tA" },
            b: { p: ["p3", "p4"], t: "tB" },
            s: [15, 9],
            subs: [{ side: 0, out: "p2", in: "p9", scoreKept: true }],
          },
        ]),
      ],
    });
    const rows = computeStandings(t);
    expect(rows.map((r) => r.id)).toEqual(["tA", "tB"]);
    expect(rows[0]).toMatchObject({ name: "Player 1 & Player 2", points: 15, wins: 1 });
  });

  it("counts team byes", () => {
    const t = makeTournament({
      format: "teamMexicano",
      teams: [
        { id: "tA", players: ["p1", "p2"] },
        { id: "tB", players: ["p3", "p4"] },
        { id: "tC", players: ["p5", "p6"] },
      ],
      rounds: [
        round([
          { court: 0, a: { p: ["p1", "p2"], t: "tA" }, b: { p: ["p3", "p4"], t: "tB" }, s: [12, 12] },
        ], ["tC"]),
      ],
    });
    expect(computeStandings(t).find((r) => r.id === "tC")?.byes).toBe(1);
  });
});
