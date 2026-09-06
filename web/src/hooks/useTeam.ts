import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "../api/users.api";
import type { UserRole } from "../types";

/**
 * The Team screen's rows.
 *
 * A different query key from useUsers() even though both call GET /api/users,
 * because they read different shapes out of the same response and caching them
 * together would make the assignee dropdown re-render whenever somebody's role
 * changed.
 */
export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => usersApi.listMembers(),
  });
}

export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: ({ signal }) => usersApi.fetchWorkspace(signal),
  });
}

/** Everything that changes the member list invalidates the same three keys. */
function useMemberMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace"] });
      // Removing somebody unassigns their tasks, so every list and count that
      // mentions an assignee is now stale.
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

export function useInviteMember() {
  return useMemberMutation(usersApi.inviteMember);
}

export function useChangeRole() {
  return useMemberMutation(({ userId, role }: { userId: string; role: UserRole }) =>
    usersApi.changeRole(userId, role),
  );
}

export function useRemoveMember() {
  return useMemberMutation((userId: string) => usersApi.removeMember(userId));
}

export function useRenameWorkspace() {
  return useMemberMutation((name: string) => usersApi.renameWorkspace(name));
}
