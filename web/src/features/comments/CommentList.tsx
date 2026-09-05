import { Avatar } from "../../components/ui/Avatar";
import { formatFullDate, formatRelative } from "../../lib/time";
import type { Comment } from "../../types";

// Oldest first, as the server sorts them — a conversation reads top to bottom.
//
// NO ⋯ on a comment. The design draws one, but editing and deleting comments
// are on the plan's exclusion list, and an inert menu repeated on every comment
// is the "visible control that does nothing" AGENTS.md warns about. Same call
// V7 made for the list's Actions column. Said out loud in docs/notes/v8.md.

export function CommentList({ comments }: { comments: Comment[] }) {
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
        <li key={comment._id} className="flex gap-3 px-4 py-4">
          <Avatar name={comment.authorId.name} size="md" />

          <div className="min-w-0 flex-1">
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
            </p>

            {/* whitespace-pre-wrap keeps the line breaks somebody typed.
                Markdown is NOT rendered: turning user text into HTML is how
                you get an injection bug, and doing it safely needs a
                sanitiser nobody asked for. */}
            <p className="mt-1 text-sm whitespace-pre-wrap text-ink">
              {comment.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
