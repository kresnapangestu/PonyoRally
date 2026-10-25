const PREFIX = "ponyo";

/** Every key this app writes starts with this. */
export const STORAGE_PREFIX = `${PREFIX}:`;

export const STORAGE_KEYS = {
  prefs: `${PREFIX}:prefs`,
  draft: `${PREFIX}:draft`,
  index: `${PREFIX}:index`,
  tournament: (id: string) => `${PREFIX}:t:${id}`,
  corrupt: (id: string) => `${PREFIX}:corrupt:${id}`,
} as const;

/** sessionStorage: the splash plays once per browser session. */
export const SESSION_KEYS = {
  splashSeen: `${PREFIX}:splash-seen`,
} as const;
