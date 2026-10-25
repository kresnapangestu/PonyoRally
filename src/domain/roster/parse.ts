import { NAME_MAX_LENGTH } from "@/constants/limits";

/**
 * Turns pasted text (often a WhatsApp list) into player names: one per
 * non-empty line. Duplicate names are kept; two people can share a name.
 */

export interface RejectedLine {
  /** 1-based line number in the pasted text. */
  line: number;
  text: string;
  reason: "tooLong";
}

export interface ParsedRoster {
  names: string[];
  emptyLines: number;
  rejected: RejectedLine[];
}

// "1. Nina", "2) Mia", "3 - Elvi", "- Olvi", "• Iren", "* Ratih"
const LIST_PREFIX = /^(?:\d{1,3}\s*[.):-]|[-–•*·])\s*/;
// Zero-width spaces/joiners and BOM that sneak in from chat apps.
const INVISIBLE = /[​-‍⁠﻿]/g;

export function cleanName(raw: string) {
  return raw.replace(INVISIBLE, "").replace(/\s+/g, " ").trim().replace(LIST_PREFIX, "").trim();
}

export function parseRosterText(text: string): ParsedRoster {
  const result: ParsedRoster = { names: [], emptyLines: 0, rejected: [] };

  text.split(/\r\n|\r|\n/).forEach((rawLine, index) => {
    const name = cleanName(rawLine);
    if (!name) {
      result.emptyLines += 1;
    } else if (name.length > NAME_MAX_LENGTH.player) {
      result.rejected.push({ line: index + 1, text: name, reason: "tooLong" });
    } else {
      result.names.push(name);
    }
  });

  // A trailing newline is not a meaningful "empty line" to report.
  if (text.endsWith("\n") || text.endsWith("\r")) result.emptyLines -= 1;
  return result;
}

/** Case- and spacing-insensitive key, so "BUNA" and "buna" count as the same name. */
export function nameKey(name: string) {
  return cleanName(name).toLocaleLowerCase("id");
}

/** Names that appear more than once, for the "same name" badge. */
export function findDuplicateNameKeys(names: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    const key = nameKey(name);
    if (!key) continue;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return duplicates;
}
