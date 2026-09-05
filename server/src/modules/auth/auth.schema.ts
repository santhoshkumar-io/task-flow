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
