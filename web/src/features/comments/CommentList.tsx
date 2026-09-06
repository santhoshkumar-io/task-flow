import type { Comment } from "../../types";
import { CommentItem } from "./CommentItem";

// Oldest first, as the server sorts them — a conversation reads top to bottom.
//
// Each comment carries the design's ⋯ menu, but only on your own: editing and
// deleting are author-only on the server, so offering the menu to anybody else
// would be a control that always fails. See CommentItem.
//
// This replaces the note that used to sit here saying there was no ⋯ at all,
// which was true while editing and deleting were on the exclusion list.

export function CommentList({
  comments,
  taskId,
}: {
  comments: Comment[];
  taskId: string;
}) {
  if (comments.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted">
        No comments yet. Start the conversation.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {comments.map((comment) => (
        <CommentItem key={comment._id} comment={comment} taskId={taskId} />
      ))}
    </ul>
  );
}
