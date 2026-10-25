import { describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { doublesMatch, makeTournament, round } from "@/domain/__fixtures__/tournament";
import type { Tournament } from "@/domain/types";
import { applyImport, backupFileName, createBackup, parseBackup, planImport } from "./backup";
import { CURRENT_VERSION, migrate, wrap } from "./migrations";
import { createRepository } from "./repository";
import { memoryStorage, type KeyValueStorage } from "./storage";

const sample = (id = "t1", extra: Partial<Tournament> = {}): Tournament =>
  makeTournament({
    id,
    rounds: [round([doublesMatch(["p1", "p2"], ["p3", "p4"], [14, 10]), doublesMatch(["p5", "p6"], ["p7", "p8"], undefined, 1)])],
    ...extra,
  });

const setup = (initial: Record<string, string> = {}) => {
  const storage = memoryStorage(initial);
  let clock = 1000;
  return { storage, repo: createRepository(storage, () => ++clock) };
};

describe("repository", () => {
  it("saves and loads a tournament unchanged except updatedAt", () => {
    const { repo } = setup();
    const saved = repo.save(sample());
    expect(saved.ok).toBe(true);
    const loaded = repo.load("t1");
    expect(loaded).toEqual({ ok: true, tournament: { ...sample(), updatedAt: 1001 } });
  });

  it("lists summaries, newest first", () => {
    const { repo } = setup();
    repo.save(sample("a", { name: "A" }));
    repo.save(sample("b", { name: "B" }));
    expect(repo.list().map((s) => s.id)).toEqual(["b", "a"]);
    expect(repo.list()[0]).toMatchObject({ name: "B", rounds: 1, status: "active" });
  });

  it("rebuilds a missing or broken index from the tournament keys", () => {
    const { storage, repo } = setup();
    repo.save(sample("a"));
    repo.save(sample("b"));
    storage.setItem(STORAGE_KEYS.index, "{not json");
    expect(repo.list().map((s) => s.id).sort()).toEqual(["a", "b"]);
    storage.removeItem(STORAGE_KEYS.index);
    expect(repo.list()).toHaveLength(2);
  });

  it("quarantines unreadable data instead of deleting it", () => {
    const { storage, repo } = setup({ [STORAGE_KEYS.tournament("bad")]: "{broken" });
    expect(repo.load("bad")).toEqual({ ok: false, reason: "corrupt" });
    expect(storage.getItem(STORAGE_KEYS.tournament("bad"))).toBeNull();
    expect(repo.listCorrupt()).toEqual(["bad"]);
    expect(repo.readCorrupt("bad")).toBe("{broken");
  });

  it("quarantines data that is valid JSON but inconsistent", () => {
    const broken = sample("x");
    broken.rounds[0].matches[0].a.p = ["ghost", "p2"];
    const { repo } = setup({ [STORAGE_KEYS.tournament("x")]: JSON.stringify(wrap(broken)) });
    expect(repo.load("x")).toEqual({ ok: false, reason: "corrupt" });
  });

  it("refuses data from a newer app version without touching it", () => {
    const raw = JSON.stringify({ v: CURRENT_VERSION + 1, data: sample() });
    const { storage, repo } = setup({ [STORAGE_KEYS.tournament("t1")]: raw });
    expect(repo.load("t1")).toEqual({ ok: false, reason: "newerVersion" });
    expect(storage.getItem(STORAGE_KEYS.tournament("t1"))).toBe(raw);
  });

  it("reports a full storage instead of throwing", () => {
    const full: KeyValueStorage = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    expect(createRepository(full).save(sample())).toEqual({ ok: false, reason: "quota" });
  });

  it("removes a tournament and clears everything on reset", () => {
    const { storage, repo } = setup({ "other-app": "keep" });
    repo.save(sample("a"));
    repo.save(sample("b"));
    repo.remove("a");
    expect(repo.list().map((s) => s.id)).toEqual(["b"]);
    repo.clearAll();
    expect(storage.keys()).toEqual(["other-app"]);
  });

  it("stays compact: a 16-player, 15-round tournament is a few KB", () => {
    const { storage, repo } = setup();
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `id${i}xxxx`, name: `Player ${i}`, joinedRound: 0, status: "active" as const }));
    const ids = players.map((p) => p.id);
    const rounds = Array.from({ length: 15 }, () =>
      round(
        [0, 1, 2, 3].map((c) => doublesMatch([ids[c * 4], ids[c * 4 + 1]], [ids[c * 4 + 2], ids[c * 4 + 3]], [14, 10], c)),
      ),
    );
    repo.save(sample("big", { players, rounds, courts: ["1", "2", "3", "4"] }));
    expect(storage.getItem(STORAGE_KEYS.tournament("big"))!.length).toBeLessThan(8 * 1024);
  });
});

describe("v1 → v2 migration", () => {
  it("turns an old fixed-total tournament into scoring: total", () => {
    const { scoring, targetPoints, ...rest } = sample("old");
    expect(scoring).toBe("total");
    const v1 = { ...rest, totalPoints: targetPoints };
    const { repo } = setup({ [STORAGE_KEYS.tournament("old")]: JSON.stringify({ v: 1, data: v1 }) });

    const loaded = repo.load("old");
    expect(loaded.ok && loaded.tournament).toMatchObject({ scoring: "total", targetPoints: 24 });
    expect(loaded.ok && "totalPoints" in loaded.tournament).toBe(false);
  });
});

describe("migrate", () => {
  it("runs each step in order", () => {
    const steps = { 1: (d: unknown) => ({ ...(d as object), two: true }), 2: (d: unknown) => ({ ...(d as object), three: true }) };
    expect(migrate({}, 1, steps, 3)).toEqual({ ok: true, data: { two: true, three: true } });
  });

  it("rejects newer and invalid versions", () => {
    expect(migrate({}, 5, {}, 1)).toEqual({ ok: false, reason: "newerVersion" });
    expect(migrate({}, 0)).toEqual({ ok: false, reason: "invalidVersion" });
    expect(migrate({}, 1, {}, 2)).toEqual({ ok: false, reason: "invalidVersion" });
  });
});

describe("backup", () => {
  const now = new Date(2026, 9, 25, 9, 0);

  it("round-trips through export and import", () => {
    const text = JSON.stringify(createBackup([sample("a"), sample("b")], now));
    const parsed = parseBackup(text);
    expect(parsed).toEqual({ ok: true, tournaments: [sample("a"), sample("b")] });
  });

  it("names the file by date", () => {
    expect(backupFileName(now)).toBe("ponyo-rally-2026-10-25.json");
  });

  it.each([
    ["not json", "{oops", "notJson"],
    ["someone else's file", JSON.stringify({ hello: "world" }), "notBackup"],
    ["a newer app's file", JSON.stringify({ ...createBackup([sample()], now), v: CURRENT_VERSION + 1 }), "newerVersion"],
    ["an empty backup", JSON.stringify(createBackup([], now)), "empty"],
    ["a damaged tournament", JSON.stringify(createBackup([{ ...sample(), targetPoints: -1 }], now)), "invalid"],
  ])("rejects %s", (_label, text, error) => {
    expect(parseBackup(text)).toEqual({ ok: false, error });
  });

  it("rejects files over 5 MB", () => {
    expect(parseBackup("x".repeat(5 * 1024 * 1024 + 1))).toEqual({ ok: false, error: "tooLarge" });
  });

  it("plans and applies merge, merge-replace and replace-all", () => {
    const { repo } = setup();
    repo.save(sample("a", { name: "Old A" }));
    repo.save(sample("c", { name: "Only here" }));
    const incoming = [sample("a", { name: "New A" }), sample("b")];

    expect(planImport(incoming, new Set(["a", "c"]))).toEqual({ total: 2, conflicts: ["a"] });

    applyImport(repo, incoming, "merge");
    expect(repo.list().map((s) => [s.id, s.name]).sort()).toEqual([["a", "Old A"], ["b", "Test"], ["c", "Only here"]]);

    applyImport(repo, incoming, "mergeReplace");
    expect(repo.list().find((s) => s.id === "a")?.name).toBe("New A");

    applyImport(repo, incoming, "replaceAll");
    expect(repo.list().map((s) => s.id).sort()).toEqual(["a", "b"]);
  });
});
