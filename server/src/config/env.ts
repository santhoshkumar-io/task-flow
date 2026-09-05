import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Read the settings once, at startup, and refuse to run if any is missing or
// malformed. The cost of a bad setting is paid in the first second rather than
// on someone's first login three versions from now.

// Node reads a .env file into process.env by itself since version 20.12, so no
// extra library is needed for this. Tests set their own values and must not be
// affected by whatever happens to be in this developer's .env.
const envFilePath = fileURLToPath(new URL("../../.env", import.meta.url));
if (process.env.NODE_ENV !== "test" && existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // process.env values are always strings. coerce turns "4000" into 4000, so
  // the rest of the code never has to remember to convert it.
  PORT: z.coerce.number().int().positive().default(4000),

  // Accepts a local server (mongodb://) and MongoDB Atlas (mongodb+srv://).
  MONGODB_URI: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      { message: "must start with mongodb:// or mongodb+srv://" },
    ),

  // 32 characters is the length of the string openssl rand -base64 32 produces.
  // Anything shorter is almost certainly a placeholder that was never replaced.
  JWT_SECRET: z
    .string()
    .min(32, "must be at least 32 characters — generate one with: openssl rand -base64 32"),

  JWT_EXPIRES_IN: z.string().min(1).default("7d"),

  CORS_ORIGIN: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const key = issue.path.join(".") || "(root)";
      return `  ${key}: ${issue.message}`;
    });

    console.error(
      [
        "",
        "Cannot start: the settings in server/.env are wrong.",
        ...lines,
        "",
        "Copy server/.env.example to server/.env and fill in the real values.",
        "",
      ].join("\n"),
    );

    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === "production";
