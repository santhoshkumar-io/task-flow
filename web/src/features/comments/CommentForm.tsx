import { Send } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ApiError } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../auth/auth-context";
import { cn } from "../../lib/cn";
import {
  COMMENT_LIMIT,
  commentSchema,
  type CommentValues,
} from "../../lib/validation";

interface CommentFormProps {
  onSubmit: (body: string) => Promise<unknown>;
  pending: boolean;
  error: unknown;
}

export function CommentForm({ onSubmit, pending, error }: CommentFormProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  });

  const body = useWatch({ control, name: "body" }) ?? "";

  const submit = handleSubmit(async (values) => {
    await onSubmit(values.body);
    // Cleared only after the server accepted it. Clearing on submit would
    // throw away what somebody typed if the request then failed.
    reset({ body: "" });
  });

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex gap-3 border-t border-line bg-white p-4",
        // Docked to the bottom below 768px — section 8.9. Sticky rather than
        // fixed: it stays in the flow, so it cannot overlap the last comment
        // and needs no compensating padding. bottom-16 clears the mobile tab
        // bar, which is 64px tall.
        "sticky bottom-16 z-10 md:static md:z-auto",
      )}
    >
      {/* The composer shows your own avatar, so it carries your tint. */}
      {user && (
        <Avatar
          name={user.name}
          size="md"
          tone="accent"
          className="hidden sm:flex"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            // Short on a phone where the docked bar must not eat the screen,
            // taller on desktop where there is room.
            className="md:min-h-24"
            // The Zod rule refuses an empty body with the server's own wording,
            // so nothing is sent for an empty comment.
            error={errors.body?.message ?? apiMessage(error)}
            {...register("body")}
          />

          {/* Phone: a round send button, as the plan's step 4 describes. */}
          <Button
            type="submit"
            loading={pending}
            aria-label="Post comment"
            className="size-10 shrink-0 rounded-full p-0 md:hidden"
          >
            {!pending && (
              <Send className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>

        <div className="mt-2 hidden items-center justify-between gap-3 md:flex">
          {/* Hint text only. @ mentions are on the exclusion list — the design
              shows this line and nothing behind it. */}
          <p className="text-xs text-muted">Use @ to mention a teammate</p>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs text-muted",
                body.length > COMMENT_LIMIT && "text-destructive",
              )}
            >
              {body.length} / {COMMENT_LIMIT}
            </span>
            <Button type="submit" size="sm" loading={pending}>
              Comment
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

// A failure the server described. A field list would already be beside the box,
// so this is for everything else — a 500, or the server being unreachable.
function apiMessage(error: unknown): string | undefined {
  if (error instanceof ApiError && error.fields.length === 0) {
    return error.message;
  }
  return undefined;
}
