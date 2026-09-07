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

  // The two rate limits, as SETTINGS rather than constants in the code.
  //
  // V10 requires each guard to be made to fire on purpose. With a constant, the
  // only way to do that is to edit the source, hit it, and remember to change
  // it back — and "remember to change it back" is how a 2-attempt login limit
  // reaches production. As a setting it is one variable for one run, and the
  // default is what everybody else gets.
  //
  // See docs/decisions/0019-rate-limits-from-env.md.
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  // Login is where password guessing happens, and a wrong guess costs the
  // attacker nothing. Five in fifteen minutes makes guessing useless and is far
  // above anything a real person does — nobody mistypes their own password five
  // times in a quarter of an hour and then a sixth.
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(5),

  // Everything else. This one exists for abuse, not for guessing, so it is
  // deliberately loose: the task list alone can be a handful of requests per
  // screen, and a limit a real person can reach is a bug.
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive().default(300),

  // Where the frontend lives, used to build the link in a password reset
  // email. Separate from CORS_ORIGIN even though they are the same value today:
  // one says who may call this API, the other says what to put in an email.
  // Conflating them means the day they differ, changing one silently changes
  // the other.
  APP_URL: z.string().url().default("http://localhost:5173"),

  // Sending email. ALL OPTIONAL: without them the app still starts and still
  // works, and the reset link is written to the server log instead with a loud
  // warning. Refusing to boot without SMTP would mean nobody could run this
  // project without an email account, for a feature they may never touch.
  // See docs/decisions/0020-password-reset.md.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),

  // Implicit TLS on connect (port 465). Port 587 upgrades with STARTTLS
  // instead, which nodemailer does on its own, so this stays false there.
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // What the email says it is from. Defaults to the login user, which is what
  // most providers require anyway — Gmail rewrites anything else.
  SMTP_FROM: z.string().min(1).optional(),

  // How many proxies sit in front of this server.
  //
  // Express reads the caller's address from the socket. In production the
  // socket belongs to a load balancer, not to a person, so every request
  // looks like it came from the same place — and the login limiter, which
  // counts five attempts per address per fifteen minutes, becomes five
  // attempts for EVERYBODY. The sixth person to sign in that quarter hour
  // is refused.
  //
  // Telling Express how many hops to skip makes req.ip the real caller
  // again. The number is not a constant because it describes the hosting
  // in front of the app rather than the app: two on Render behind a Vercel
  // rewrite (Vercel's edge, then Render's balancer), one on Render alone,
  // zero on a laptop.
  //
  // Zero means "trust nobody", which is Express's default and the only
  // safe answer when nothing is in front: a forwarded-for header from the
  // open internet is written by whoever sent it.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),

  // How many people this workspace may hold. The design's Team footer reads
  // "5 members · 2 seats remaining", which is only honest if both halves are
  // real numbers — the remainder is this minus the actual user count.
  SEAT_LIMIT: z.coerce.number().int().positive().default(7),
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
