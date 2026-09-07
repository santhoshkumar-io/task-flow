import { createContext, use } from "react";
import type * as authApi from "../../api/auth.api";
import type { User } from "../../types";

// FOUR states. It was three until V7 found the fourth.
//
// A refresh wipes everything JavaScript was holding, so on startup the app has
// to ask the server "am I logged in?" — and until that answer arrives it does
// not know.
//
//   checking    → waiting for the answer. Show a spinner.
//   signedIn    → the server sent back a user.
//   signedOut   → the server SAID 401. It answered, and the answer was no.
//   unreachable → nothing answered at all. We do not know, and must not guess.
//
// Treating "checking" as "signedOut" is the classic bug: the login screen
// flashes on every refresh, and anyone mid-task is redirected away before the
// real answer lands.
//
// "unreachable" is the same mistake one step along, and V6 had it. Any failure
// on startup was read as "not logged in", so stopping the backend threw a
// signed-in person out to the login screen — losing their place over a server
// restart, when their cookie was still perfectly valid. "The server said no"
// and "the server said nothing" are different answers and only one of them is
// about the user.
export type AuthStatus = "checking" | "signedIn" | "signedOut" | "unreachable";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (payload: authApi.LoginPayload) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Who is logged in, available anywhere, without passing the user down through
// six layers of components.
export function useAuth(): AuthContextValue {
  const context = use(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return context;
}
