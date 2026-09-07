import { useQuery } from "@tanstack/react-query";
import { fetchTaskStats, fetchUserStats } from "../api/stats.api";
import { useAuth } from "../features/auth/auth-context";

export function useTaskStats() {
  return useQuery({
    queryKey: ["task-stats"],
    queryFn: ({ signal }) => fetchTaskStats(signal),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["user-stats"],
    queryFn: ({ signal }) => fetchUserStats(signal),
    // Read by the Team screen and by the sidebar badge, which is mounted on
    // every signed-in screen. One request covers both for a minute rather than
    // one per navigation.
    staleTime: 60 * 1000,
  });
}

/**
 * What the signed-in person still has to do — the count badge beside "My
 * Tasks" that V6 drew nothing for, because the number did not exist yet.
 *
 * `open` is the badge, NOT `assigned`. A badge that counts finished work is a
 * count of nothing in particular: it would still say 9 after you had done all
 * nine. `assigned` comes back too, because the badge has to be able to explain
 * itself — "8 of your 9 tasks are not done" — when somebody notices it differs
 * from the number of rows on the list.
 * See docs/decisions/0016-the-badge-counts-unfinished-work.md.
 *
 * Returns undefined while it is loading or if it failed. The sidebar draws no
 * badge in that case rather than a zero, because a zero is a claim.
 */
export function useMyOpenTaskCount():
  | { open: number; assigned: number }
  | undefined {
  const { user } = useAuth();
  const stats = useUserStats();

  if (!user || !stats.data) return undefined;

  const row = stats.data.find((entry) => entry.userId === user._id);
  if (!row) return undefined;

  return { open: row.open, assigned: row.assigned };
}
