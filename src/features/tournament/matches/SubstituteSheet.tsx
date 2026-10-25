"use client";

import { ChevronRightIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { FORMAT_RULES } from "@/constants/formats";
import { NAME_MAX_LENGTH } from "@/constants/limits";
import type { ScoreDecision } from "@/domain/operations";
import type { ID, Tournament } from "@/domain/types";
import { useT } from "@/i18n/useT";
import { useToastStore } from "@/store/toast-store";
import { useTournamentStore } from "@/store/tournament-store";
import { opErrorMessage } from "../op-error";
import { gameNumber, type Names } from "../view-model";
import { substitutionCandidates, type Candidate } from "./substitution-candidates";

interface SubstituteSheetProps {
  tournament: Tournament;
  roundIndex: number;
  matchIndex: number;
  names: Names;
  onClose: () => void;
}

type Pending = { kind: "sub"; in: ID } | { kind: "swap"; with: ID; matchIndex: number };

/**
 * Replace a player: pick who leaves, pick who comes in (or add someone new),
 * and if a score is already recorded, decide what happens to it.
 */
export function SubstituteSheet({ tournament, roundIndex, matchIndex, names, onClose }: SubstituteSheetProps) {
  const translator = useT();
  const { t } = translator;
  const store = useTournamentStore.getState();
  const showToast = useToastStore((s) => s.show);

  const match = tournament.rounds[roundIndex].matches[matchIndex];
  const [outId, setOutId] = useState<ID | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsGender = FORMAT_RULES[tournament.format].needsGender;
  const outGender = tournament.players.find((p) => p.id === outId)?.gender;

  /** The recorded score this change would affect, in this match or the one swapped with. */
  const pendingScore = (p: Pending) =>
    match.s ?? (p.kind === "swap" ? tournament.rounds[roundIndex].matches[p.matchIndex].s : undefined);
  const scoreRecorded = (p: Pending) => pendingScore(p) !== undefined;

  function apply(p: Pending, decision?: ScoreDecision) {
    if (!outId) return;
    if (!decision && scoreRecorded(p)) return setPending(p);

    const result =
      p.kind === "sub"
        ? store.substitute({ round: roundIndex, match: matchIndex }, { out: outId, in: p.in, decision })
        : store.swapPlayers(roundIndex, outId, p.with, decision);
    if (!result.ok) return setError(opErrorMessage(result.error, translator));

    showToast(
      p.kind === "sub"
        ? t("tournament.sub.done", { out: names.player(outId), in: names.player(p.in) })
        : t("tournament.sub.swapped", { a: names.player(outId), b: names.player(p.with) }),
    );
    onClose();
  }

  function addAndUse() {
    const added = store.addLatePlayer(newName, needsGender ? outGender : undefined);
    if (!added.ok) return setError(opErrorMessage(added.error, translator));
    apply({ kind: "sub", in: added.playerId });
  }

  const candidateLabel = (c: Candidate) =>
    c.kind === "busy"
      ? t("tournament.sub.busy", { n: gameNumber(tournament, roundIndex, c.matchIndex!) })
      : t(`tournament.sub.${c.kind}`);

  const title = pending
    ? t("tournament.sub.decisionTitle")
    : outId
      ? t("tournament.sub.pickIn", { name: names.player(outId) })
      : t("tournament.sub.pickOut");

  return (
    <Sheet open onClose={onClose} title={title} closeLabel={t("common.close")}>
      <div className="flex flex-col gap-3">
        {error && <Notice tone="error">{error}</Notice>}

        {!outId && (
          <ul className="flex flex-col gap-2">
            {[...match.a.p, ...match.b.p].map((id) => (
              <li key={id}>
                <OptionButton onClick={() => setOutId(id)} title={names.player(id)} />
              </li>
            ))}
          </ul>
        )}

        {outId && !pending && (
          <>
            {needsGender && outGender && (
              <p className="text-sm text-text-muted">
                {t("tournament.sub.sameGender", {
                  gender: t(outGender === "M" ? "wizard.players.male" : "wizard.players.female").toLowerCase(),
                })}
              </p>
            )}
            {(() => {
              const candidates = substitutionCandidates(tournament, roundIndex, matchIndex, outId);
              if (candidates.length === 0) return <p className="text-sm text-text-muted">{t("tournament.sub.none")}</p>;
              return (
                <ul className="flex flex-col gap-2">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <OptionButton
                        title={names.player(c.id)}
                        subtitle={candidateLabel(c)}
                        onClick={() =>
                          apply(c.kind === "busy" ? { kind: "swap", with: c.id, matchIndex: c.matchIndex! } : { kind: "sub", in: c.id })
                        }
                      />
                    </li>
                  ))}
                </ul>
              );
            })()}

            <div className="mt-2 flex flex-col gap-2 rounded-card border border-dashed border-border p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <UserPlusIcon className="size-5 text-primary-soft" aria-hidden="true" />
                {t("tournament.sub.newPlayer")}
              </p>
              <TextField
                label={t("tournament.sub.newPlayerName")}
                hideLabel
                placeholder={t("tournament.sub.newPlayerName")}
                value={newName}
                maxLength={NAME_MAX_LENGTH.player}
                onChange={(e) => setNewName(e.target.value)}
                autoComplete="off"
                autoCapitalize="words"
              />
              <Button variant="secondary" disabled={!newName.trim()} onClick={addAndUse}>
                {t("tournament.sub.addAndUse")}
              </Button>
            </div>
          </>
        )}

        {pending && (
          <>
            <p className="text-text-muted">
              {t("tournament.sub.decisionBody", { score: formatScore(pendingScore(pending)) })}
            </p>
            <Button
              block
              size="lg"
              onClick={() => apply(pending, "keep")}
            >
              {t("tournament.sub.keep", {
                name: names.player(pending.kind === "sub" ? pending.in : pending.with),
              })}
            </Button>
            <Button block size="lg" variant="secondary" onClick={() => apply(pending, "clear")}>
              {t("tournament.sub.clear")}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

const formatScore = (score: [number, number] | undefined) => (score ? `${score[0]}–${score[1]}` : "");

function OptionButton({ title, subtitle, onClick }: { title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-card border border-border bg-surface px-4 text-left transition-transform duration-120 active:scale-[0.98]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        {subtitle && <span className="block text-sm text-text-muted">{subtitle}</span>}
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}
