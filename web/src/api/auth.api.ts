import type { User } from "../types";
import { api } from "./client";

interface UserResponse {
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export async function login(payload: LoginPayload): Promise<User> {
  const { user } = await api.post<UserResponse>("/auth/login", payload);
  return user;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { user } = await api.post<UserResponse>("/auth/register", payload);
  return user;
}

export async function logout(): Promise<void> {
  await api.post<void>("/auth/logout");
}

// The "am I logged in?" call, made once on startup.
//
// skipUnauthorizedHandler is important: a 401 here is a normal answer meaning
// "you are logged out", not a session that just expired. Without it, this call
// would trigger the global redirect on every visit by a logged-out person and
// fight with the router.
export async function fetchMe(): Promise<User> {
  const { user } = await api.get<UserResponse>("/auth/me", {
    skipUnauthorizedHandler: true,
  });
  return user;
}

// The two halves of forgetting a password.
//
// Neither needs a login — somebody who cannot sign in is the only person who
// ever calls them.

/**
 * Always resolves, whatever the address was.
 *
 * The server answers identically for a registered and an unregistered email on
 * purpose, so this cannot become a way to find out who has an account. The
 * screen has to say the same thing either way.
 */
export async function forgotPassword(email: string): Promise<string> {
  const { message } = await api.post<{ message: string }>(
    "/auth/forgot-password",
    { email },
  );
  return message;
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<string> {
  const { message } = await api.post<{ message: string }>(
    "/auth/reset-password",
    { token, password },
  );
  return message;
}

/**
 * Settings → Security. Both of these hand back a FRESH pass.
 *
 * Each one moves passwordChangedAt forward, and the server refuses every pass
 * issued before that moment — including the one the request arrived with. The
 * new cookie is what stops the button signing you out of the device you pressed
 * it on. Nothing is needed here to read it: the browser stores it from the
 * Set-Cookie header like any other.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const { message } = await api.patch<{ message: string }>("/auth/password", {
    currentPassword,
    newPassword,
  });
  return message;
}

export async function signOutOtherDevices(): Promise<string> {
  const { message } = await api.post<{ message: string }>(
    "/auth/sign-out-others",
  );
  return message;
}
