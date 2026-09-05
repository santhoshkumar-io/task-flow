import { useDeleteTask, useTask } from "../../hooks/useTask";
import type { Task } from "../../types";
import { DeleteTaskDialog } from "./DeleteTaskDialog";

// Deleting from a row of the task list.
//
// GET /api/tasks does NOT return commentCount — only the detail route does —
// so the dialog fetches the task it is about to destroy. Until that lands the
// Delete button is disabled: nothing is removed before the dialog can say what
// is going with it.
//
// The extra request costs nothing in practice. TanStack caches it under
// ["task", id], so opening the task afterwards is instant.

export function DeleteTaskFromList({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const detail = useTask(task._id);
  const remove = useDeleteTask(task._id);

  return (
    <DeleteTaskDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={task.title}
      commentCount={detail.data?.commentCount ?? 0}
      countPending={detail.isPending}
      pending={remove.isPending}
      onConfirm={() => remove.mutate(undefined, { onSuccess: onClose })}
    />
  );
}
