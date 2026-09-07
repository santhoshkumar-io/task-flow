import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createTask } from "../api/tasks.api";
import type { Task } from "../types";

/**
 * The design's third ⋯ item.
 *
 * No server work was needed: duplicating is POST /api/tasks with the same
 * fields, which is exactly what the create drawer sends. Adding a
 * /tasks/:id/duplicate route would have been a second way to do one thing.
 *
 * What is deliberately NOT copied: the key (the counter issues a new one), the
 * creator (whoever presses this owns the copy, not the original author), the
 * comments and the activity. A copy is a fresh task that starts out looking
 * like an old one — not a clone of its history.
 */
export function useDuplicateTask() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (task: Task) =>
      createTask({
        // Named so nobody has to guess which of two identical rows is which.
        title: `${task.title} (copy)`,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId?._id ?? null,
        // Dropped when it has already passed: the server refuses a past due
        // date on create, so copying one would fail the whole action for a
        // reason nobody would connect to the button they pressed.
        dueDate: isPast(task.dueDate) ? null : task.dueDate,
      }),

    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["user-stats"] });

      // Straight to the copy. A duplicate that appears silently somewhere in a
      // paged list is one people press twice.
      void navigate(`/tasks/${copy._id}`);
    },
  });
}

function isPast(dueDate: string | null): boolean {
  if (!dueDate) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return new Date(dueDate) < startOfToday;
}
