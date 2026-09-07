import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  deleteComment,
  listActivity,
  listComments,
  updateComment,
} from "../api/comments.api";
import {
  deleteTask,
  getTask,
  updateTask,
  type UpdateTaskPayload,
} from "../api/tasks.api";

// Everything the detail screen needs.
//
// The rule that runs through this file: a change to one task invalidates BOTH
// ["task", id] and ["tasks"]. The list holds its own copy of every task it has
// fetched, so invalidating only the single task means the save works, you press
// back, and the list still shows the old status — which looks like the save
// failed even though it did not.

export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: ({ signal }) => getTask(id, signal),
    // A task id that is not 24 hex characters is a 400 from the server and
    // will never become valid, so there is nothing to fetch.
    enabled: Boolean(id),
  });
}

export function useComments(id: string) {
  return useQuery({
    queryKey: ["comments", id],
    queryFn: ({ signal }) => listComments(id, signal),
    enabled: Boolean(id),
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ["activity", id],
    queryFn: ({ signal }) => listActivity(id, signal),
    enabled: Boolean(id),
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) => updateTask(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["task", id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // A status, priority or assignee change writes an activity row, so the
      // Activity card in the right rail is stale too.
      void queryClient.invalidateQueries({ queryKey: ["activity", id] });
    },
  });
}

export function useDeleteTask(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteTask(id),
    onSuccess: () => {
      // Drop the single task rather than refetching it — it is gone, and
      // asking for it again would only produce a 404.
      queryClient.removeQueries({ queryKey: ["task", id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateComment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => createComment(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", id] });
      // commentCount lives on the task, and the delete dialog reads it. Without
      // this the dialog would offer to remove "3 comments" after a fourth was
      // posted.
      void queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
  });
}

/**
 * Editing does NOT touch ["task", id].
 *
 * Unlike posting or deleting, an edit leaves commentCount alone — the number of
 * comments has not moved, only the words in one of them. Invalidating the task
 * as well would refetch it to learn nothing.
 */
export function useUpdateComment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      updateComment(id, commentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", id] });
    },
  });
}

/** Deleting DOES change commentCount, so the task goes with it. */
export function useDeleteComment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(id, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", id] });
      void queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
  });
}
