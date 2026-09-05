import { AppError } from "../../lib/AppError.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
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

  if (!user) {
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
