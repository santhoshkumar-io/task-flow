import type { Activity, Comment } from "../types";
import { api } from "./client";

// A comment belongs to a task, and the URL says so:
//   GET    /api/tasks/:taskId/comments
//   POST   /api/tasks/:taskId/comments
//   PATCH  /api/tasks/:taskId/comments/:commentId
//   DELETE /api/tasks/:taskId/comments/:commentId
//   GET    /api/tasks/:taskId/activity

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

/**
 * Edit a comment. Author only — the server answers 404 to anybody else, not
 * 403, so a wrong id tells a stranger nothing. See docs/decisions/0006.
 *
 * The taskId is in the path, so a comment id borrowed from another task will
 * not match and cannot be edited through this one.
 */
export async function updateComment(
  taskId: string,
  commentId: string,
  body: string,
): Promise<Comment> {
  const { comment } = await api.patch<{ comment: Comment }>(
    `/tasks/${taskId}/comments/${commentId}`,
    { body },
  );
  return comment;
}

/** Delete a comment. Author only, and the same 404 for everybody else. */
export function deleteComment(
  taskId: string,
  commentId: string,
): Promise<void> {
  return api.delete<void>(`/tasks/${taskId}/comments/${commentId}`);
}
