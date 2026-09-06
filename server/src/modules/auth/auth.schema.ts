import { z } from "zod";

// What valid input looks like. Checked on the server no matter what the
// frontend does, because anyone can send a request without using it at all.

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    // bcrypt only looks at the first 72 bytes of a password. Accepting more
    // would silently ignore the rest, so say no instead of pretending.
    .max(72, "Password must be 72 characters or fewer"),
  // Same as login: registering signs you in, so the same choice applies.
  // Defaults to true so a client that does not send it behaves as before.
  rememberMe: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  // Defaults to true so a client that does not send it behaves as before.
  rememberMe: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  // 32 random bytes as hex. Checked for shape here so a malformed token is a
  // 400 rather than a database lookup that was never going to match.
  token: z.string().regex(/^[a-f0-9]{64}$/, "This link is not valid"),
  // The same rules register uses. A reset must not be a way around them.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Settings → Security. The current password is required even though the caller
// is already signed in: a session left open on a shared machine must not be
// enough to change the password and lock the owner out.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
