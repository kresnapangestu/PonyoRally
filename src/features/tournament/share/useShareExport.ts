"use client";

import { useEffect, useState } from "react";
import { pageCapacity, paginate } from "./pagination";
import { loadCardAssets, renderShareCard } from "./render-card";
import { shareFileName } from "./share-files";
import type { ShareSnapshot } from "./share-snapshot";

export interface SharePage {
  file: File;
  url: string;
}

export type ExportState =
  | { status: "rendering"; done: number; total: number }
  | { status: "ready"; pages: SharePage[] }
  | { status: "empty" }
  | { status: "error" };

/** Last export, so reopening the sheet with unchanged data doesn't redraw. */
let cache: { key: string; files: File[] } | null = null;

async function renderAll(snapshot: ShareSnapshot, onProgress: (done: number, total: number) => void) {
  if (cache?.key === snapshot.key) return cache.files;

  const pages = paginate(snapshot.entries, pageCapacity());
  const assets = await loadCardAssets(snapshot.fontFamily);
  const files: File[] = [];
  for (let i = 0; i < pages.length; i++) {
    onProgress(i, pages.length);
    const blob = await renderShareCard(snapshot, pages[i], i + 1, pages.length, assets);
    files.push(new File([blob], shareFileName(snapshot.tournamentName, snapshot.kind, i + 1), { type: "image/png" }));
    // Yield between pages so the sheet stays responsive on slower phones.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  cache = { key: snapshot.key, files };
  return files;
}

/**
 * Turns a snapshot into PNG files (one per page) plus preview URLs. The
 * effect syncs with browser resources (canvas, object URLs) and revokes the
 * URLs when the sheet closes.
 */
export function useShareExport(snapshot: ShareSnapshot, attempt: number) {
  const [state, setState] = useState<ExportState>(() =>
    snapshot.entries.length === 0 ? { status: "empty" } : { status: "rendering", done: 0, total: 1 },
  );

  useEffect(() => {
    if (snapshot.entries.length === 0) return;
    let active = true;
    const urls: string[] = [];

    renderAll(snapshot, (done, total) => active && setState({ status: "rendering", done, total }))
      .then((files) => {
        if (!active) return;
        const pages = files.map((file) => {
          const url = URL.createObjectURL(file);
          urls.push(url);
          return { file, url };
        });
        setState({ status: "ready", pages });
      })
      .catch(() => active && setState({ status: "error" }));

    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [snapshot, attempt]);

  return state;
}
