import type { ShareCardKind } from "./share-snapshot";

/** "Sunday Rally!" → "sunday-rally"; accents dropped, safe on every OS. */
export function slugify(text: string, maxLength = 40) {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "tournament";
}

/** e.g. ponyo-rally-sunday-rally-leaderboard-01.png */
export function shareFileName(tournamentName: string, kind: ShareCardKind, page: number) {
  return `ponyo-rally-${slugify(tournamentName)}-${kind}-${String(page).padStart(2, "0")}.png`;
}

export type ShareOutcome = "shared" | "cancelled" | "unsupported" | "failed";

type ShareNavigator = Pick<Navigator, "share" | "canShare">;

const browserNavigator = (): Partial<ShareNavigator> => (typeof navigator === "undefined" ? {} : navigator);

/** True only when this browser can hand these exact files to the share sheet. */
export function canShareFiles(files: File[], nav: Partial<ShareNavigator> = browserNavigator()) {
  if (files.length === 0 || typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Opens the native share sheet. Must run inside a user gesture (a tap).
 * "shared" only means the sheet completed: the browser can't tell us which
 * app was picked or whether anyone received the image.
 */
export async function shareFiles(
  files: File[],
  data: { title?: string; text?: string },
  nav: Partial<ShareNavigator> = browserNavigator(),
): Promise<ShareOutcome> {
  if (!canShareFiles(files, nav)) return "unsupported";
  try {
    await nav.share!({ files, ...data });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}
