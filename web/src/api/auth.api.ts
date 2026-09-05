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
