const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const LENGTH = 8;

/**
 * Short random ID (8 chars, ~41 bits). Uses getRandomValues rather than
 * randomUUID, which is missing on plain-HTTP origins such as a LAN IP.
 */
export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

/** 32-bit seed for a new tournament's random draws. */
export function createSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
