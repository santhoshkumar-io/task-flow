import { Schema, model, type HydratedDocument } from "mongoose";

// The design's Team screen shows Admin, Engineer, Designer and Product Manager.
// V9 refused to draw the column because roles did not exist and a column of
// invented values is worse than no column. They exist now, and ONE OF THEM DOES
// SOMETHING: an admin may delete anybody's task, where before only the creator
// could. A role that changes no behaviour is decoration.
// See docs/decisions/0021-roles-are-real.md.
export const USER_ROLES = [
  "admin",
  "engineer",
  "designer",
  "product_manager",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// Somebody invited exists as a record with no password, and cannot sign in
// until they accept. See docs/decisions/0022-invitations.md.
export const USER_STATUSES = ["active", "invited"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface User {
  name: string;
  email: string;
  // Never the password. A one-way scramble of it (a hash), which cannot be
  // turned back into the password even with a full copy of this collection.
  // Absent for somebody who was invited and has not accepted yet — there is
  // no password to hash until they choose one.
  passwordHash?: string;

  role: UserRole;
  status: UserStatus;

  /** Shown on the Settings profile tab. An IANA name, e.g. "Asia/Kolkata". */
  timezone?: string;

  /** Settings → Notifications. Stored, and honestly labelled as not yet acted on. */
  notifyOnAssignment: boolean;
  notifyOnMention: boolean;

  // A one-way scramble of the password reset token, never the token itself.
  // Same reasoning as passwordHash: a stolen copy of this collection must not
  // let anybody reset an account. SHA-256 rather than bcrypt because this value
  // is 32 random bytes, not a guessable human password — there is nothing to
  // brute force, so the deliberate slowness of bcrypt buys nothing here.
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;

  // When the password last changed. requireAuth refuses any pass issued before
  // this moment, so resetting a password really does sign out the sessions
  // somebody else may be holding — which is the whole point of resetting it.
  passwordChangedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      // Stored lowercase so Alice@work.com and alice@work.com are one account.
      // The unique index below compares the stored value, so without this two
      // people could register the "same" address in different capitalisation.
      lowercase: true,
      unique: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      // NOT required any more: an invited person has none until they accept.
      // login() already refuses an account with no hash.
      required: false,
      // Left out of every read unless a query asks for it by name.
      select: false,
    },

    // All three are select:false for the same reason the hash is: no ordinary
    // read of a user should be able to carry a live reset token out with it.
    role: { type: String, enum: USER_ROLES, default: "engineer", index: true },
    status: { type: String, enum: USER_STATUSES, default: "active", index: true },
    timezone: { type: String, default: null },
    notifyOnAssignment: { type: Boolean, default: true },
    notifyOnMention: { type: Boolean, default: true },

    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    passwordChangedAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Belt and braces. `select: false` above already keeps the hash out of
        // ordinary reads; this makes it impossible for any response to carry it
        // even if some future query explicitly asks for it.
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const UserModel = model<User>("User", userSchema);
