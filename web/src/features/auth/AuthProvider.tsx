import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../../api/auth.api";
import { ApiError, setUnauthorizedHandler } from "../../api/client";
import type { User } from "../../types";
import { AuthContext, type AuthStatus } from "./auth-context";

// The three states and the useAuth hook live in auth-context.ts, so this file
// exports only a component and Vite can hot-reload it on its own.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<User | null>(null);

  // "Am I logged in?" — asked on startup, and again on a timer while the
  // server cannot be reached.
  //
  // No cancelled flag: AuthProvider sits above the router in main.tsx and is
  // mounted for the life of the app, so there is no unmount to guard against.
  // A promise chain rather than async/await on purpose: it is what makes it
  // clear — to a reader and to the lint rule — that nothing here sets state
  // while the effect below is running. The answer always arrives later.
  const check = useCallback(
    () =>
      authApi.fetchMe().then(
        (me) => {
          setUser(me);
          setStatus("signedIn");
        },
        (error: unknown) => {
          setUser(null);

          // status 0 is our own NETWORK_ERROR: fetch itself failed, so nothing
          // ever answered. That is NOT the same as a 401, and treating it as
          // one is what threw a signed-in person out to the login screen when
          // the backend was stopped. We genuinely do not know, so we say so.
          setStatus(
            error instanceof ApiError && error.status === 0
              ? "unreachable"
              : "signedOut",
          );
        },
      ),
    [],
  );

  // This is the whole reason the "checking" state exists — the answer takes
  // time, and during that time the app does not know.
  useEffect(() => {
    void check();
  }, [check]);

  // While the server is down, keep asking. The moment it answers, the app
  // corrects itself to signedIn or signedOut on its own — so bringing the
  // backend back does not need a page reload.
  //
  // Only runs in the one state that needs it, and stops the moment it leaves.
  useEffect(() => {
    if (status !== "unreachable") return;

    const timer = setInterval(() => void check(), 5000);
    return () => clearInterval(timer);
  }, [status, check]);

  // If any request anywhere comes back 401, the pass has expired or been
  // cleared. Drop to signed out rather than leaving screens full of failures.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("signedOut");
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (payload: authApi.LoginPayload) => {
    const me = await authApi.login(payload);
    setUser(me);
    setStatus("signedIn");
  }, []);

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    const me = await authApi.register(payload);
    setUser(me);
    setStatus("signedIn");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Even if the request fails, this browser is done being logged in.
      setUser(null);
      setStatus("signedOut");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
