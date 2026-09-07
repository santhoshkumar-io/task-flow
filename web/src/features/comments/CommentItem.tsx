import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ApiError } from "../../api/client";
import { PersonAvatar } from "../../components/PersonAvatar";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Textarea } from "../../components/ui/Textarea";
import { useDeleteComment, useUpdateComment } from "../../hooks/useTask";
import { cn } from "../../lib/cn";
import { formatFullDate, formatRelative } from "../../lib/time";
import {
  COMMENT_LIMIT,
  commentSchema,
  type CommentValues,
} from "../../lib/validation";
import type { Comment } from "../../types";
import { useAuth } from "../auth/auth-context";

// One comment, with the design's ⋯ menu.
//
// AUTHOR ONLY, and the menu is not drawn at all for anybody else. The server
// already refuses — it answers 404 to a stranger rather than 403, see
// docs/decisions/0006 — so this is not the guard. It is the reason not to offer
// a control that would always fail.
//
// Edit happens IN PLACE rather than in a dialog: the words you are changing
// should stay where you were reading them.

export function CommentItem({
  comment,
  taskId,
  className,
}: {
  comment: Comment;
  taskId: string;
  /** Used by the phone fold in CommentList. */
  className?: string;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const remove = useDeleteComment(taskId);
  const mine = comment.authorId._id === user?._id;

  // Mongoose stamps both fields from the same value on create, so they differ
  // only after a real edit.
  const edited = comment.updatedAt !== comment.createdAt;

  return (
    <li className={cn("flex gap-3 px-4 py-4", className)}>
      <PersonAvatar person={comment.authorId} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-ink">
              {comment.authorId.name}
            </span>
            <span
              className="text-xs text-muted"
              title={formatFullDate(comment.createdAt)}
            >
              {formatRelative(comment.createdAt)}
            </span>
            {/* An edited comment that looks untouched is a small lie, and the
                record already carries what is needed to tell the truth. */}
            {edited && (
              <span
                className="text-xs text-muted"
                title={`Edited ${formatFullDate(comment.updatedAt)}`}
              >
                (edited)
              </span>
            )}
          </p>

          {mine && !editing && (
            <CommentMenu
              onEdit={() => setEditing(true)}
              onDelete={() => setConfirmingDelete(true)}
            />
          )}
        </div>

        {editing ? (
          <EditForm
            comment={comment}
            taskId={taskId}
            onDone={() => setEditing(false)}
          />
        ) : (
          // whitespace-pre-wrap keeps the line breaks somebody typed.
          // Markdown is NOT rendered: turning user text into HTML is how you
          // get an injection bug, and doing it safely needs a sanitiser nobody
          // asked for.
          <p className="mt-1 text-sm whitespace-pre-wrap text-ink">
            {comment.body}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete comment?"
        confirmLabel="Delete comment"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(comment._id, {
            onSuccess: () => setConfirmingDelete(false),
          })
        }
      >
        {/* Naming what is about to go is something you can decide about.
            "Are you sure?" is a shrug. */}
        This will remove your comment{" "}
        <span className="text-ink">{quoted(comment.body)}</span>. This cannot be
        undone.
      </ConfirmDialog>
    </li>
  );
}

function CommentMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Comment actions"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink focus:ring-2 focus:ring-accent/30 focus:outline-none"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-40 rounded-lg border border-line bg-white p-1 shadow-md"
        >
          <DropdownMenu.Item
            onSelect={onEdit}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink outline-none data-highlighted:bg-surface"
          >
            <Pencil className="size-4 shrink-0" aria-hidden="true" />
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={onDelete}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none data-highlighted:bg-status-blocked-bg"
          >
            <Trash2 className="size-4 shrink-0" aria-hidden="true" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * The in-place editor.
 *
 * Reuses `commentSchema`, the rule the compose box already applies, so the
 * 2000-character cap and its wording cannot drift between posting a comment and
 * editing one — which is exactly how somebody ends up able to post a short
 * comment and then grow it past the cap. The server applies the same rule to
 * both routes for the same reason.
 */
function EditForm({
  comment,
  taskId,
  onDone,
}: {
  comment: Comment;
  taskId: string;
  onDone: () => void;
}) {
  const update = useUpdateComment(taskId);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: comment.body },
  });

  const body = useWatch({ control, name: "body" }) ?? "";

  const submit = handleSubmit(async (values) => {
    // Nothing changed, so close without a request. Writing the same words back
    // would still move updatedAt and mark the comment "(edited)".
    if (values.body === comment.body) {
      onDone();
      return;
    }

    await update.mutateAsync({ commentId: comment._id, body: values.body });
    onDone();
  });

  return (
    <form onSubmit={submit} className="mt-2">
      <Textarea
        rows={3}
        aria-label="Edit comment"
        autoFocus
        error={errors.body?.message ?? apiMessage(update.error)}
        {...register("body")}
      />

      <div className="mt-2 flex items-center justify-end gap-3">
        <span
          className={cn(
            "mr-auto text-xs text-muted",
            body.length > COMMENT_LIMIT && "text-destructive",
          )}
        >
          {body.length} / {COMMENT_LIMIT}
        </span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDone}
          disabled={update.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={update.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}

/** The first few words, so the dialog names what it is about to delete. */
function quoted(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const short = flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
  return `“${short}”`;
}

// A failure the server described. Field errors already sit under the box, so
// this is for everything else — a 500, or the server being unreachable.
function apiMessage(error: unknown): string | undefined {
  if (error instanceof ApiError && error.fields.length === 0) {
    return error.message;
  }
  return undefined;
}
