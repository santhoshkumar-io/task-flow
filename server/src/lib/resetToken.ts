import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// The password reset token.
//
// Two halves, and keeping them apart is the whole design:
//
//   the RAW token   goes in the email, and exists nowhere else
//   its SHA-256 HASH goes in the database
//
// So a stolen copy of the users collection contains no usable reset links, in
// exactly the way it contains no usable passwords. This is the same reasoning
// as passwordHash, applied to a second secret.
//
// SHA-256 and not bcrypt: bcrypt is slow on purpose to make GUESSING expensive,
// and there is nothing to guess here. 32 random bytes is 256 bits of entropy —
// far beyond brute force — so slowness would only make every reset slower.

/** How long a link works for. Long enough to find the email, short enough that a forgotten one in an inbox stops mattering. */
export const RESET_TOKEN_TTL_MINUTES = 60;

export interface ResetToken {
  /** Goes in the email. Never stored. */
  raw: string;
  /** Goes in the database. Never emailed. */
  hash: string;
  expiresAt: Date;
}

export function createResetToken(): ResetToken {
  const raw = randomBytes(32).toString("hex");

  return {
    raw,
    hash: hashResetToken(raw),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  };
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Compares two hashes without leaking how far they matched.
 *
 * A plain === returns as soon as two characters differ, so the time it takes
 * depends on how much of the value was right. Measured over many attempts that
 * is enough to reconstruct a secret one character at a time. This always looks
 * at every byte.
 */
export function matchesResetToken(raw: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashResetToken(raw), "hex");
  const stored = Buffer.from(storedHash, "hex");

  // timingSafeEqual throws rather than returning false on a length mismatch,
  // and a stored value of the wrong length is corrupt data, not a match.
  if (candidate.length !== stored.length) return false;

  return timingSafeEqual(candidate, stored);
}
