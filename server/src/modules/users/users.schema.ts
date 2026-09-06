import { z } from "zod";
import { USER_ROLES } from "../../models/user.model.js";

export const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(USER_ROLES).default("engineer"),
});

export const acceptInviteSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "This link is not valid"),
  // The same rules as registering. Accepting an invitation must not be a way
  // around them.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

// Every field optional: this is a PATCH, so it means "change these".
//
// TWO FIELDS ARE DELIBERATELY ABSENT, and both absences are load-bearing:
//
//   email — changing it needs a verification round trip to prove the new
//           address is theirs, and email verification is still excluded. The
//           Settings screen shows it locked.
//
//   role  — this route is "edit MYSELF", and letting somebody set their own
//           role means anybody can become an admin. An admin may delete
//           anybody's task, so that is a straight privilege-escalation path.
//           Roles are changed by an admin, on the Team screen, through
//           PATCH /api/users/:id/role. See docs/decisions/0021-roles-are-real.md.
//
// .strict() is what makes those absences mean something: sending either one is
// a 400 rather than a field that gets quietly dropped while the response looks
// like a success.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100).optional(),
    timezone: z.string().trim().max(64).nullable().optional(),
    notifyOnAssignment: z.boolean().optional(),
    notifyOnMention: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change",
  });

/** Admin only, and never through updateProfileSchema. */
export const changeRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

/** Settings → Workspace. Admin only. */
export const renameWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(100),
});

export type RenameWorkspaceInput = z.infer<typeof renameWorkspaceSchema>;
