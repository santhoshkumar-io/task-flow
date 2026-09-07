import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { CommentForm } from "../features/comments/CommentForm";
import { CommentList } from "../features/comments/CommentList";
import { ActivityCard } from "../features/tasks/ActivityCard";
import { DeleteTaskDialog } from "../features/tasks/DeleteTaskDialog";
import { ErrorState } from "../features/tasks/ErrorState";
import { NotFoundTask } from "../features/tasks/NotFoundTask";
import { TaskDetailSkeleton } from "../features/tasks/TaskDetailSkeleton";
import { TaskEditForm } from "../features/tasks/TaskEditForm";
import { TaskHeader } from "../features/tasks/TaskHeader";
import { TaskInfoCard } from "../features/tasks/TaskInfoCard";
import { useDuplicateTask } from "../hooks/useDuplicateTask";
import { useAuth } from "../features/auth/auth-context";
import {
  useActivity,
  useComments,
  useCreateComment,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from "../hooks/useTask";
import { useUsers } from "../hooks/useTasks";

export function TaskDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const duplicate = useDuplicateTask();
  const { user } = useAuth();

  const detail = useTask(id);
  const comments = useComments(id);
  const activity = useActivity(id);
  const users = useUsers();

  const update = useUpdateTask(id);
  const remove = useDeleteTask(id);
  const addComment = useCreateComment(id);

  // Edit mode lives in the URL, not in state — `?edit=1`. Same rule as the
  // list's filters (docs/decisions/0010): a refresh keeps you in the form, the
  // back button leaves it, and the ⋯ on a list row can link straight into it.
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get("edit") === "1";

  const setEditing = (next: boolean) => {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (next) params.set("edit", "1");
        else params.delete("edit");
        return params;
      },
      { replace: true },
    );
  };

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (detail.isPending) {
    return <TaskDetailSkeleton />;
  }

  // A 404 (no such task, or somebody else's task you may not delete) and a 400
  // INVALID_ID (not 24 hex characters) mean the same thing to a person: there
  // is nothing at this address. Anything else is a real failure and gets the
  // retry panel with its request id.
  if (detail.isError) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;

    if (status === 404 || status === 400) {
      return <NotFoundTask />;
    }

    return (
      <Card padding="none">
        <ErrorState
          error={detail.error}
          onRetry={() => void detail.refetch()}
          retrying={detail.isFetching}
        />
      </Card>
    );
  }

  const { task, commentCount } = detail.data;

  // Only the creator may delete — docs/decisions/0006. Everyone may edit, which
  // is why Edit is not gated. Hiding Delete is a kindness so nobody clicks
  // something that will fail; the server's 404 is the actual guard.
  const canDelete = user?._id === task.creatorId._id;

  return (
    <div className="mx-auto max-w-6xl">
      {editing ? (
        <>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <span aria-hidden="true">←</span> Back to tasks
          </Link>

          {/* The key and heading are drawn by TaskEditForm now, alongside the
              Cancel and Save buttons the design puts on the same row. */}
          <div className="mt-4" />

          <TaskEditForm
            task={task}
            people={users.data ?? []}
            saving={update.isPending}
            error={update.error}
            canDelete={canDelete}
            onCancel={() => {
              update.reset();
              setEditing(false);
            }}
            onDelete={() => setConfirmingDelete(true)}
            onSave={(payload) =>
              update.mutate(payload, { onSuccess: () => setEditing(false) })
            }
          />
        </>
      ) : (
        <>
          {/* The header lives INSIDE the left column, not above both.
              Section 6 puts Edit and the ⋯ "on the right" of the left column,
              and spanning the full width pushed them over the right rail,
              where they sat on top of the Task information card. */}
          {/* Below 1024px both wrappers are `display: contents`, so the five
              cards become direct children of this one column and the
              `order-*` classes below can interleave them — header, then the
              facts, then description, then comments, then activity, which is
              the phone frame's order. At and above 1024px the wrappers
              become real boxes again and the two-column layout is exactly
              what it was. Spacing comes from this gap-6 either way. */}
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="contents lg:block lg:min-w-0 lg:flex-1 lg:space-y-6">
              <TaskHeader
                task={task}
                activity={activity.data ?? []}
                canDelete={canDelete}
                onDuplicate={() => duplicate.mutate(task)}
                onEdit={() => setEditing(true)}
                onDelete={() => setConfirmingDelete(true)}
                className="order-1 lg:order-none"
              />

              <Card padding="none" className="order-3 lg:order-none">
                <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-semibold text-ink">
                  Description
                </h2>
                <div className="px-4 py-4 text-sm text-ink">
                  {task.description ? (
                    // Line breaks kept; not rendered as HTML. Turning user text
                    // into markup is how an injection bug arrives.
                    <p className="whitespace-pre-wrap">{task.description}</p>
                  ) : (
                    <p className="text-muted">No description.</p>
                  )}
                </div>
              </Card>

              <Card padding="none" className="order-4 lg:order-none">
                <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 font-heading text-sm font-semibold text-ink">
                  Comments
                  {/* The real count from the API, not comments.length —
                      which would read 0 while the list is still loading. */}
                  <Badge tone="neutral">{commentCount}</Badge>
                </h2>

                {comments.isPending ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">
                    Loading comments…
                  </p>
                ) : comments.isError ? (
                  <ErrorState
                    error={comments.error}
                    onRetry={() => void comments.refetch()}
                    retrying={comments.isFetching}
                  />
                ) : (
                  <CommentList comments={comments.data} taskId={id} />
                )}

                <CommentForm
                  pending={addComment.isPending}
                  error={addComment.error}
                  onSubmit={(body) => addComment.mutateAsync(body)}
                />
              </Card>
            </div>

            {/* The 300px-ish rail from section 6, and below 1024px two more
                cards in the single column above. */}
            <div className="contents lg:block lg:w-[300px] lg:shrink-0 lg:space-y-6">
              <TaskInfoCard task={task} className="order-2 lg:order-none" />
              <ActivityCard
                activity={activity.data ?? []}
                people={users.data ?? []}
                className="order-5 lg:order-none"
              />
            </div>
          </div>
        </>
      )}

      <DeleteTaskDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={task.title}
        commentCount={commentCount}
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => navigate("/tasks"),
          })
        }
      />
    </div>
  );
}
