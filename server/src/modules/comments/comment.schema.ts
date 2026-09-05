import { z } from "zod";

// The only thing a client may send. taskId comes from the URL and authorId
// comes from the login cookie, so neither is listed here — the same
// allow-list idea used for creatorId on tasks.
export const createCommentSchema = z.object({
  body: z
    .string({ error: "Comment can't be empty" })
    .trim()
    .min(1, "Comment can't be empty")
    // Matches the 0 / 2000 counter the design shows on the compose box.
    .max(2000, "Comment must be 2000 characters or fewer"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
