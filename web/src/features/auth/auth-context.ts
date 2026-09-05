import { createContext, use } from "react";
import type * as authApi from "../../api/auth.api";
import type { User } from "../../types";

// THREE states, not two.
//
// A refresh wipes everything JavaScript was holding, so on startup the app has
// to ask the server "am I logged in?" — and until that answer arrives it does
// not know.
//
//   checking  → waiting for the answer. Show a spinner.
//   signedIn  → the server sent back a user.
//   signedOut → the server said 401.
//
// Treating "checking" as "signedOut" is the classic bug: the login screen
// flashes for a moment on every single refresh, and anyone mid-task gets
// redirected away before the real answer lands.
export type AuthStatus = "checking" | "signedIn" | "signedOut";

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
