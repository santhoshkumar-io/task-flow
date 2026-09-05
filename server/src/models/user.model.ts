import { Schema, model, type HydratedDocument } from "mongoose";

export interface User {
  name: string;
  email: string;
  // Never the password. A one-way scramble of it (a hash), which cannot be
  // turned back into the password even with a full copy of this collection.
  passwordHash: string;
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
      required: true,
      // Left out of every read unless a query asks for it by name.
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Belt and braces. `select: false` above already keeps the hash out of
        // ordinary reads; this makes it impossible for any response to carry it
        // even if some future query explicitly asks for it.
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const UserModel = model<User>("User", userSchema);
