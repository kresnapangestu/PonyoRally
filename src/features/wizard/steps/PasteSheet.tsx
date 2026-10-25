"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { NAME_MAX_LENGTH } from "@/constants/limits";
import { findDuplicateNameKeys, nameKey, parseRosterText } from "@/domain/roster/parse";
import { useT } from "@/i18n/useT";

interface PasteSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (names: string[]) => void;
}

/** Paste a list, see exactly what will be added, then confirm. */
export function PasteSheet({ open, onClose, onAdd }: PasteSheetProps) {
  const { t, tp } = useT();
  const [text, setText] = useState("");
  const textareaId = useId();

  const parsed = useMemo(() => parseRosterText(text), [text]);
  const duplicates = useMemo(() => findDuplicateNameKeys(parsed.names), [parsed.names]);
  const duplicateCount = parsed.names.filter((n) => duplicates.has(nameKey(n))).length;
  const count = parsed.names.length;

  const close = () => {
    setText("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t("wizard.paste.title")}
      closeLabel={t("common.close")}
      footer={
        <Button
          size="lg"
          block
          disabled={count === 0}
          onClick={() => {
            onAdd(parsed.names);
            close();
          }}
        >
          {count === 0 ? t("wizard.paste.nothing") : tp("wizard.paste.confirm", count)}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor={textareaId} className="text-sm font-semibold">
          {t("wizard.paste.label")}
        </label>
        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("wizard.paste.placeholder")}
          rows={8}
          className="w-full resize-none rounded-input border border-border bg-surface p-3 text-base leading-relaxed focus:border-primary-soft focus:outline-none"
          autoCapitalize="words"
          autoComplete="off"
        />
        <p className="text-sm text-text-muted">{t("wizard.paste.hint")}</p>

        <div aria-live="polite" className="flex flex-col gap-2">
          {count > 0 && (
            <p className="text-sm font-semibold">
              {tp("wizard.paste.detected", count)}
              {duplicateCount > 0 && <> · {tp("wizard.paste.duplicates", duplicateCount)}</>}
              {parsed.emptyLines > 0 && <> · {tp("wizard.paste.emptyLines", parsed.emptyLines)}</>}
            </p>
          )}
          {parsed.rejected.map((line) => (
            <Notice key={line.line} tone="warning">
              {t("wizard.paste.tooLong", { line: line.line, max: NAME_MAX_LENGTH.player })}
            </Notice>
          ))}
          {count > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {parsed.names.map((name, i) => (
                <li
                  key={i}
                  className={`rounded-full px-2.5 py-1 text-sm ${
                    duplicates.has(nameKey(name)) ? "bg-accent text-accent-fg" : "bg-surface-2"
                  }`}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
