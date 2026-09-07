import type {
  PersonRef,
  TeamMember,
  User,
  UserRole,
  Workspace,
} from "../types";
import { api } from "./client";

/**
 * Everybody, for the assignee dropdowns.
 *
 * Typed as PersonRef because that is all a dropdown needs. The route returns
 * more than this — see listMembers — but a dropdown that started depending on
 * a role would be a dropdown that breaks when roles change.
 */
export async function listUsers(): Promise<PersonRef[]> {
  const { users } = await api.get<{ users: PersonRef[] }>("/users");
  return users;
}

/**
 * The same route, read as full rows for the Team screen.
 *
 * One request, two shapes. Splitting it into two endpoints would mean two
 * round trips for the same documents, and the extra fields cost nothing to
 * send — the list is capped by the seat limit.
 */
export async function listMembers(): Promise<TeamMember[]> {
  const { users } = await api.get<{ users: TeamMember[] }>("/users");
  return users;
}

export async function fetchWorkspace(signal?: AbortSignal): Promise<Workspace> {
  const { workspace } = await api.get<{ workspace: Workspace }>(
    "/users/workspace",
    { signal },
  );
  return workspace;
}

export interface InvitePayload {
  name: string;
  email: string;
  role: UserRole;
}

/** Admin only. Anybody else gets a 403 from the server. */
export async function inviteMember(payload: InvitePayload): Promise<string> {
  const { message } = await api.post<{ message: string }>(
    "/users/invite",
    payload,
  );
  return message;
}

export function acceptInvite(token: string, password: string): Promise<void> {
  return api.post<void>("/auth/accept-invite", { token, password });
}

/**
 * Admin only, and deliberately NOT part of updateMe.
 *
 * Letting somebody set their own role means anybody can become an admin, and
 * an admin may delete anybody's task. See docs/decisions/0021-roles-are-real.md.
 */
export function changeRole(userId: string, role: UserRole): Promise<void> {
  return api.patch<void>(`/users/${userId}/role`, { role });
}

/** Admin only. Their tasks are unassigned rather than deleted. */
export function removeMember(userId: string): Promise<void> {
  return api.delete<void>(`/users/${userId}`);
}

/** Settings → Profile. Your own record only; `role` and `email` are refused. */
export interface UpdateProfilePayload {
  name?: string;
  timezone?: string | null;
  notifyOnAssignment?: boolean;
  notifyOnMention?: boolean;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  const { user } = await api.patch<{ user: User }>("/users/me", payload);
  return user;
}

export async function renameWorkspace(name: string): Promise<Workspace> {
  const { workspace } = await api.patch<{ workspace: Workspace }>(
    "/users/workspace",
    { name },
  );
  return workspace;
}
