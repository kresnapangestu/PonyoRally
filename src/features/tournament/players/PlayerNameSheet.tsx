"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { NAME_MAX_LENGTH } from "@/constants/limits";
import type { Gender } from "@/domain/types";
import { useT } from "@/i18n/useT";

interface PlayerNameSheetProps {
  title: string;
  hint?: string;
  initialName?: string;
  askGender: boolean;
  error: string | null;
  onSave: (name: string, gender?: Gender) => void;
  onClose: () => void;
}

/** Shared form for adding a late player and renaming one. */
export function PlayerNameSheet({ title, hint, initialName = "", askGender, error, onSave, onClose }: PlayerNameSheetProps) {
  const { t } = useT();
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<Gender | null>(null);
  const valid = name.trim() !== "" && (!askGender || gender !== null);

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      closeLabel={t("common.close")}
      footer={
        <Button size="lg" block disabled={!valid} onClick={() => onSave(name, gender ?? undefined)}>
          {t("tournament.players.save")}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name, gender ?? undefined);
        }}
      >
        <TextField
          label={t("tournament.players.nameLabel")}
          value={name}
          maxLength={NAME_MAX_LENGTH.player}
          onChange={(e) => setName(e.target.value)}
          hint={hint}
          error={error ?? undefined}
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
        />
        {askGender && (
          <Segmented<Gender>
            label={t("wizard.players.genderOf", { name: name || t("tournament.players.nameLabel") })}
            value={gender}
            onChange={setGender}
            options={[
              { value: "M", label: t("wizard.players.male") },
              { value: "F", label: t("wizard.players.female") },
            ]}
          />
        )}
      </form>
    </Sheet>
  );
}
