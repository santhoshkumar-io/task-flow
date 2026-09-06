import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

// Sending email, with one seam and one fallback.
//
// SMTP settings are OPTIONAL on purpose. Somebody cloning this project to look
// at the task list should not have to own an email account before the server
// will boot, for a feature they may never touch. So:
//
//   configured    -> a real message over SMTP
//   not configured-> the link is written to the server log, loudly, and the
//                    request still succeeds
//
// The fallback is deliberately noisy rather than silent. A quiet no-op would
// mean "check your email" on screen and nothing anywhere, which is the worst
// version of this: it looks like it worked.

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

// Built once and reused. A transporter holds a connection pool, so making a
// new one per message would open a new SMTP conversation every time.
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });

  return transporter;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!isMailConfigured()) {
    logInstead(mail);
    return;
  }

  await getTransporter().sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

function logInstead(mail: Mail): void {
  console.warn(
    [
      "",
      "  ┌─ EMAIL NOT SENT — no SMTP settings ".padEnd(72, "─"),
      `  │ to      : ${mail.to}`,
      `  │ subject : ${mail.subject}`,
      "  │",
      ...mail.text.split("\n").map((line) => `  │ ${line}`),
      "  │",
      "  │ Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env to send this",
      "  │ for real. See .env.example.",
      "  └".padEnd(72, "─"),
      "",
    ].join("\n"),
  );
}

/**
 * Checks the SMTP settings actually work, at startup rather than the first
 * time somebody forgets their password.
 *
 * Never throws: bad email settings must not stop the API serving tasks. It
 * says so on the console and the app carries on.
 */
export async function verifyMailer(): Promise<void> {
  if (!isMailConfigured()) {
    console.warn(
      "email: no SMTP settings — password reset links will be printed here instead",
    );
    return;
  }

  try {
    await getTransporter().verify();
    console.log(`email: SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT})`);
  } catch (error) {
    console.error(
      `email: SMTP settings are set but not working (${env.SMTP_HOST}:${env.SMTP_PORT}).`,
      "Password reset emails will fail. The rest of the API is unaffected.",
      error instanceof Error ? error.message : error,
    );
  }
}
