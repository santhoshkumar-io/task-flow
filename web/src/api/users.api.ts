import type { PersonRef } from "../types";
import { api } from "./client";

/**
 * Everyone who can be assigned a task — feeds the Assignee dropdown in the
 * filter bar and in the create drawer.
 *
 * The server sends only { _id, name, email } and sorts by name, so there is
 * nothing to trim or re-sort here.
 */
export async function listUsers(): Promise<PersonRef[]> {
  const { users } = await api.get<{ users: PersonRef[] }>("/users");
  return users;
}
