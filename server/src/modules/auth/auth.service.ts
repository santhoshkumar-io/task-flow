import type { Types } from "mongoose";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { sendMail } from "../../lib/mailer.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  createResetToken,
  hashResetToken,
  matchesResetToken,
} from "../../lib/resetToken.js";
import { passwordResetEmail } from "./passwordReset.email.js";
import { UserModel, type UserDocument } from "../../models/user.model.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

// The rules. Knows nothing about HTTP: no request, no response, no status
// codes beyond what AppError carries. That is what lets the tests check a rule
// without pretending to be a browser.

export async function register(input: RegisterInput): Promise<UserDocument> {
  const passwordHash = await hashPassword(input.password);

  try {
    return await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
  } catch (error) {
    // Two people registering the same address at the same moment both pass an
    // "is this email free?" check and both insert. The unique index in the
    // database is the only place that race is actually settled — error 11000 is
    // MongoDB saying it caught one.
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, "EMAIL_TAKEN", "That email is already registered");
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<UserDocument> {
  // passwordHash is select:false on the model, so it has to be asked for.
  const user = await UserModel.findOne({ email: input.email }).select(
    "+passwordHash",
  );

  // Same message whether the address is unknown or the password is wrong.
  // Saying "no such email" would hand an attacker a way to discover which of
  // our users exist.
  const invalid = new AppError(
    401,
    "INVALID_CREDENTIALS",
    "Invalid email or password",
  );

  // No account, OR an invited one that has never set a password. Both are
  // treated identically and answer the same way — saying "that account exists
  // but has not been activated" would confirm the address is registered here,
  // which is the whole thing this route goes out of its way not to do.
  if (!user || !user.passwordHash) {
    // Scramble anyway so a missing account does not answer measurably faster
    // than a wrong password. Without this, response time alone reveals which
    // addresses are registered.
    await hashPassword(input.password);
    throw invalid;
  }

  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) {
    throw invalid;
  }

  return user;
}

export async function findById(id: string): Promise<UserDocument | null> {
  return UserModel.findById(id);
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

/**
 * Step one of a reset: make a token, store its hash, email the raw one.
 *
 * Returns NOTHING, whatever happens — not whether the address exists, not
 * whether an email went out. The controller answers the same way every time.
 * Anything else turns this route into a way to ask "does this person have an
 * account here?", which is the same account-enumeration hole login() already
 * goes out of its way to close.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await UserModel.findOne({ email });

  // No account. Nothing to do, and nothing to say.
  if (!user) return;

  const token = createResetToken();

  // Only the hash is written down. The raw token exists in memory here and in
  // the email, and nowhere else ever.
  user.passwordResetTokenHash = token.hash;
  user.passwordResetExpiresAt = token.expiresAt;
  await user.save();

  // The link points at the FRONTEND, not this API — it is opened by a person
  // in a browser, not called by code.
  const link = `${env.APP_URL}/reset-password?token=${token.raw}`;

  try {
    await sendMail(passwordResetEmail(user.email, user.name, link));
  } catch (error) {
    // The token is already saved. Failing the request now would tell the caller
    // that this address exists and that our mail server is down, and would
    // leave a usable token behind anyway. Logged for us, silent to them.
    console.error(`[auth] could not send reset email to ${user.email}`, error);
  }
}

/**
 * Step two: swap a valid token for a new password.
 *
 * The token is found by its HASH, because the hash is the only form the
 * database has. Looking it up this way also means an expired or already-used
 * token simply matches nothing.
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const invalid = new AppError(
    400,
    "INVALID_RESET_TOKEN",
    "This link is invalid or has expired. Please request a new one.",
  );

  const user = await UserModel.findOne({
    passwordResetTokenHash: hashResetToken(rawToken),
    // Checked in the query rather than afterwards, so an expired token never
    // even loads a user.
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) throw invalid;

  // Belt and braces over the query above: the same comparison again, in
  // constant time. The lookup already had to match exactly, so this is about
  // being explicit that a secret is being compared, not about catching a case
  // the query missed.
  if (
    !user.passwordResetTokenHash ||
    !matchesResetToken(rawToken, user.passwordResetTokenHash)
  ) {
    throw invalid;
  }

  user.passwordHash = await hashPassword(newPassword);

  // Single use. Cleared in the same save as the new password, so a token can
  // never be replayed.
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;

  // Signs out everything issued before now. Somebody resetting a password
  // because a session was stolen has to actually be rid of that session, and a
  // signed pass cannot be recalled — so requireAuth compares its issue time
  // against this instead. See docs/decisions/0020-password-reset.md.
  user.passwordChangedAt = new Date();

  await user.save();
}

/**
 * Settings → Security. Change your own password, knowing the old one.
 *
 * The current password is checked even though the caller is signed in. A
 * session left open on a shared machine should not be enough to take the
 * account: knowing the old password is what proves it is really them.
 */
export async function changePassword(
  userId: Types.ObjectId,
  currentPassword: string,
  newPassword: string,
): Promise<UserDocument> {
  const user = await UserModel.findById(userId).select("+passwordHash");

  if (!user || !user.passwordHash) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);

  if (!matches) {
    // Named, unlike login's deliberately vague message. There is no account
    // enumeration to worry about here — we already know exactly who is asking.
    throw new AppError(
      400,
      "WRONG_PASSWORD",
      "That is not your current password",
    );
  }

  user.passwordHash = await hashPassword(newPassword);

  // Everything issued before now stops working, so a stolen session does not
  // survive the password change that was meant to end it.
  user.passwordChangedAt = new Date();
  await user.save();

  return user;
}

/**
 * "Sign out other devices".
 *
 * The same one-line mechanism as a password reset: move passwordChangedAt
 * forward, and requireAuth stops honouring every pass issued before it. A
 * signed pass cannot be recalled, so refusing it is the only thing that can be
 * done.
 *
 * The caller's own pass was issued before the bump too, so the ROUTE has to
 * hand them a fresh one — otherwise the button signs you out of the device you
 * pressed it on, which is the opposite of what it says.
 */
export async function signOutOtherDevices(
  userId: Types.ObjectId,
): Promise<UserDocument> {
  const user = await UserModel.findById(userId);

  if (!user) throw new AppError(401, "UNAUTHORIZED", "You must be logged in");

  user.passwordChangedAt = new Date();
  await user.save();

  return user;
}
