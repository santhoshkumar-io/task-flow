import type { Mail } from "../../lib/mailer.js";
import { RESET_TOKEN_TTL_MINUTES } from "../../lib/resetToken.js";

// The one email this application sends. Kept apart from the service so the
// wording can be read and changed without going near the security logic.

export function passwordResetEmail(
  to: string,
  name: string,
  link: string,
): Mail {
  const text = [
    `Hi ${name},`,
    "",
    "Someone asked to reset the password for your TaskFlow account.",
    "Open this link to choose a new one:",
    "",
    link,
    "",
    `The link stops working in ${RESET_TOKEN_TTL_MINUTES} minutes, and can only be used once.`,
    "",
    "If this wasn't you, ignore this email. Your password has not changed.",
  ].join("\n");

  // Plain text AND html. Some clients show one, some the other, and a message
  // with only html looks empty in the ones that prefer text.
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#0a0a0a;line-height:1.55">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Someone asked to reset the password for your TaskFlow account.</p>
      <p>
        <a href="${escapeHtml(link)}"
           style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
          Choose a new password
        </a>
      </p>
      <p style="color:#737373;font-size:13px">
        Or paste this into your browser:<br>
        <span style="word-break:break-all">${escapeHtml(link)}</span>
      </p>
      <p style="color:#737373;font-size:13px">
        The link stops working in ${RESET_TOKEN_TTL_MINUTES} minutes, and can only be used once.
      </p>
      <p style="color:#737373;font-size:13px">
        If this wasn't you, ignore this email. Your password has not changed.
      </p>
    </div>
  `.trim();

  return { to, subject: "Reset your TaskFlow password", text, html };
}

// The name comes from what somebody typed at registration, so it reaches this
// template as untrusted text. Without escaping, a name containing a tag would
// be markup in every inbox that opens the message.
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
