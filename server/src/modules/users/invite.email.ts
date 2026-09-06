import type { Mail } from "../../lib/mailer.js";
import { RESET_TOKEN_TTL_MINUTES } from "../../lib/resetToken.js";

// The invitation message. Kept apart from the service for the same reason the
// password reset one is: wording should be changeable without going anywhere
// near the token logic.

export function inviteEmail(to: string, name: string, link: string): Mail {
  const text = [
    `Hi ${name},`,
    "",
    "You have been invited to join TaskFlow.",
    "Open this link to choose a password and get started:",
    "",
    link,
    "",
    `The link stops working in ${RESET_TOKEN_TTL_MINUTES} minutes, and can only be used once.`,
    "",
    "If you were not expecting this, you can ignore it. No account is active until the link is used.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#0a0a0a;line-height:1.55">
      <p>Hi ${escapeHtml(name)},</p>
      <p>You have been invited to join TaskFlow.</p>
      <p>
        <a href="${escapeHtml(link)}"
           style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
          Accept the invitation
        </a>
      </p>
      <p style="color:#737373;font-size:13px">
        Or paste this into your browser:<br>
        <span style="word-break:break-all">${escapeHtml(link)}</span>
      </p>
      <p style="color:#737373;font-size:13px">
        The link stops working in ${RESET_TOKEN_TTL_MINUTES} minutes, and can
        only be used once. No account is active until it is used.
      </p>
    </div>
  `.trim();

  return { to, subject: "You have been invited to TaskFlow", text, html };
}

// The name is typed by whoever sends the invitation, so it reaches this
// template as untrusted text.
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
