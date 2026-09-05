import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// A small signed pass (a JSON Web Token). It holds the user id and an expiry,
// and nothing else — anyone can decode and read it, so nothing secret goes in.
// The signature is what matters: without JWT_SECRET nobody can change the id
// inside it and have this server accept it.

export interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

// Returns null rather than throwing. Every reason a pass can be unusable —
// missing, expired, signed with a different secret, one character changed —
// is the same answer to the caller: we do not know who this is.
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      return null;
    }
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}
