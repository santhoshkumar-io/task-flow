import { z } from "zod";

// The SAME rules as server/src/modules/auth/auth.schema.ts.
//
// Checking here is speed and kindness, not safety. It tells the person their
// password is too short without a round trip. The server's copy is the one that
// protects the data, because anyone can send a request without this UI.
//
// Both sides run Zod 4 so the rules genuinely can be kept identical.

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    // bcrypt only reads the first 72 bytes, so anything longer would be
    // silently ignored. The server says no, and so does this.
    .max(72, "Password must be 72 characters or fewer"),
  rememberMe: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
