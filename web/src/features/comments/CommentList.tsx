import { useState } from "react";
import { cn } from "../../lib/cn";
import type { Comment } from "../../types";
import { CommentItem } from "./CommentItem";

// Oldest first, as the server sorts them — a conversation reads top to bottom.
//
// Each comment carries the design's ⋯ menu, but only on your own: editing and
// deleting are author-only on the server, so offering the menu to anybody else
// would be a control that always fails. See CommentItem.
//
// On a phone only the NEWEST is shown until you ask for the rest, behind the
// frame's "View all 3 comments". A long thread otherwise pushes the compose
// box and everything under it off a 390px screen. Desktop shows them all, as
// it always has — the fold is CSS, so the comments are all in the page and
// findable either way.

export function CommentList({
  comments,
  taskId,
}: {
  comments: Comment[];
  taskId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (comments.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted">
        No comments yet. Start the conversation.
      </p>
    );
  }

  const folded = !expanded && comments.length > 1;
  const newest = comments.length - 1;

  return (
    <>
      <ul className="divide-y divide-line">
        {comments.map((comment, index) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            taskId={taskId}
            className={cn(
              folded && index !== newest && "hidden md:flex",
            )}
          />
        ))}
      </ul>

      {folded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full border-t border-line px-4 py-3 text-left text-sm font-medium text-accent hover:underline md:hidden"
        >
          View all {comments.length} comments
        </button>
      )}
    </>
  );
}
