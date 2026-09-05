import type { Activity, Comment } from "../types";
import { api } from "./client";

// A comment belongs to a task, and the URL says so:
//   GET  /api/tasks/:taskId/comments
//   POST /api/tasks/:taskId/comments
//   GET  /api/tasks/:taskId/activity

/** Oldest first — the server sorts them, because a conversation reads down. */
export async function listComments(
  taskId: string,
  signal?: AbortSignal,
): Promise<Comment[]> {
  const { comments } = await api.get<{ comments: Comment[] }>(
    `/tasks/${taskId}/comments`,
    { signal },
  );
  return comments;
}

export async function createComment(
  taskId: string,
  body: string,
): Promise<Comment> {
  // Only `body` is sent. taskId comes from the URL and the author from the
  // login cookie, so neither can be spoofed by the request.
  const { comment } = await api.post<{ comment: Comment }>(
    `/tasks/${taskId}/comments`,
    { body },
  );
  return comment;
}

/** Newest first, capped at 20 by the server. */
export async function listActivity(
  taskId: string,
  signal?: AbortSignal,
): Promise<Activity[]> {
  const { activity } = await api.get<{ activity: Activity[] }>(
    `/tasks/${taskId}/activity`,
    { signal },
  );
  return activity;
}
