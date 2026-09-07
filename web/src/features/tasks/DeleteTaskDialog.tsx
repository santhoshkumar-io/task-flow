import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** From GET /api/tasks/:id. Never counted from what is on screen. */
  commentCount: number;
  /** True when the count is still being fetched — opened from a list row. */
  countPending?: boolean;
  onConfirm: () => void;
  pending: boolean;
}

// The design's confirm text names the task AND counts its comments:
//
//   "Fix payment webhook issue" and its 4 comments will be permanently
//   removed. This action can't be undone.
//
// Both come from the API. The count is why V5 put commentCount on the detail
// route — a hardcoded number here would be an obvious miss against the design,
// and AGENTS.md forbids putting a number on screen that did not come from a
// response.

export function DeleteTaskDialog({
  open,
  onOpenChange,
  title,
  commentCount,
  countPending,
  onConfirm,
  pending,
}: DeleteTaskDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this task?"
      confirmLabel="Delete task"
      onConfirm={onConfirm}
      pending={pending}
      // Nothing is destroyed before the dialog can say what it is destroying.
      confirmDisabled={countPending}
    >
      <>
        <span className="text-ink">“{title}”</span>
        {countPending ? (
          " and its comments"
        ) : (
          // A task with no comments is not told about "its 0 comments".
          commentCount > 0 && (
            <>
              {" and its "}
              <span className="text-ink">
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </span>
            </>
          )
        )}{" "}
        will be permanently removed. This action can't be undone.
      </>
    </ConfirmDialog>
  );
}
