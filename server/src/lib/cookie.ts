import type { Response } from "express";
import { isProduction } from "../config/env.js";

// One place that knows how the login cookie is set and cleared, so login,
// register and logout cannot drift apart. See docs/decisions/0001-token-storage.md.
export const AUTH_COOKIE_NAME = "taskflow_token";

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

// rememberMe false leaves maxAge off entirely, which makes it a session cookie:
// the browser throws it away when it closes. That is what "Keep me signed in"
// unticked has to mean for the checkbox to be honest rather than decorative.
export function setAuthCookie(
  res: Response,
  token: string,
  rememberMe = true,
): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    // JavaScript on the page cannot read this. An injected script can still act
    // as the user while they are on the page, but cannot take the pass away
    // and reuse it later.
    httpOnly: true,

    // The browser will not attach this to a request that another website
    // started. This is the defence against cross-site request forgery that
    // makes the cookie a better choice than localStorage rather than an even one.
    sameSite: "lax",

    // Only send over an encrypted connection. Off in development because
    // http://localhost is not encrypted and the cookie would never be sent.
    secure: isProduction,

    ...(rememberMe ? { maxAge: SEVEN_DAYS_IN_MS } : {}),
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  // The options must match those used to set it, or the browser keeps the old one.
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  });
}
