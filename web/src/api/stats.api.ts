import type { TaskStats, UserStats } from "../types";
import { api } from "./client";

// Both of these are counted by the database, not by this app. Fetching every
// task to count them here would send the whole table over the network to
// produce a handful of numbers, and would get slower with every task added.

export async function fetchTaskStats(signal?: AbortSignal): Promise<TaskStats> {
  const { stats } = await api.get<{ stats: TaskStats }>("/tasks/stats", {
    signal,
  });
  return stats;
}

export async function fetchUserStats(
  signal?: AbortSignal,
): Promise<UserStats[]> {
  const { stats } = await api.get<{ stats: UserStats[] }>("/users/stats", {
    signal,
  });
  return stats;
}
