import bcrypt from "bcrypt";

// bcrypt is deliberately slow. A general-purpose hash like SHA-256 is built to
// be fast, which is exactly wrong here: fast means billions of guesses a second
// on a graphics card. 12 measures at roughly half a second on this machine —
// invisible to a real person logging in, ruinous for anyone guessing.
const COST_FACTOR = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

// bcrypt stores the random extra ingredient (the salt) and the cost inside the
// hash string itself, so comparing needs nothing but the hash and the guess.
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
