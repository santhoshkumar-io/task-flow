import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../../api/auth.api";
import { setUnauthorizedHandler } from "../../api/client";
import type { User } from "../../types";
import { AuthContext, type AuthStatus } from "./auth-context";

// The three states and the useAuth hook live in auth-context.ts, so this file
// exports only a component and Vite can hot-reload it on its own.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<User | null>(null);

  // Ask the server once, on startup. This is the whole reason the "checking"
  // state exists — the answer takes time, and during that time the app does
  // not know.
  useEffect(() => {
    let cancelled = false;

    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) {
          setUser(me);
          setStatus("signedIn");
        }
      })
      .catch(() => {
        // Any failure here means "not logged in". A 401 is the normal answer.
        if (!cancelled) {
          setUser(null);
          setStatus("signedOut");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
