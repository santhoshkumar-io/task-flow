import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { sendMail } from "../../lib/mailer.js";
import { hashPassword } from "../../lib/password.js";
import { createResetToken, hashResetToken } from "../../lib/resetToken.js";
import { inviteEmail } from "./invite.email.js";
import { ActivityModel } from "../../models/activity.model.js";
import { TaskModel } from "../../models/task.model.js";
import { UserModel, type UserRole } from "../../models/user.model.js";
import { getWorkspaceDoc } from "../../models/workspace.model.js";

// Only the three fields the assignee dropdown needs. Not "everything except
// the hash" — an explicit list cannot accidentally start returning a field
// somebody adds to the model later.
export async function listUsers() {
  // role and status joined the list when the Team screen started drawing them.
  // Still an explicit field list rather than "everything except the hash": a
  // list of what we return cannot accidentally start leaking a field somebody
  // adds to the model later.
  return UserModel.find(
    {},
    { name: 1, email: 1, role: 1, status: 1, createdAt: 1 },
  )
    .sort({ name: 1 })
    .lean();
}

/** The workspace, behind the Team footer and the Settings account card. */
export async function getWorkspace(): Promise<{
  name: string;
  members: number;
  seatLimit: number;
  seatsRemaining: number;
}> {
  const [doc, members] = await Promise.all([
    getWorkspaceDoc(),
    UserModel.countDocuments({}),
  ]);

  return {
    name: doc.name,
    members,
    seatLimit: env.SEAT_LIMIT,
    // Never negative on screen. If the limit is lowered below the number of
    // people already here, "-2 seats remaining" is a worse answer than none.
    seatsRemaining: Math.max(0, env.SEAT_LIMIT - members),
  };
}

/** Settings → Workspace. Admin only, enforced by the route. */
export async function renameWorkspace(name: string): Promise<void> {
  const doc = await getWorkspaceDoc();
  doc.name = name;
  await doc.save();
}

export interface UserStats {
  userId: string;
  /** Tasks currently assigned to this person. */
  assigned: number;
  /**
   * Of those, the ones that are not Done — what this person still has to do.
   *
   * This is the number in the sidebar's My Tasks badge. A badge counting
   * finished work as well would be a count of nothing in particular.
   * See docs/decisions/0016-the-badge-counts-unfinished-work.md.
   */
  open: number;
  /** Tasks this person created. */
  created: number;
  /** When they last changed anything, or null if they never have. */
  lastActiveAt: string | null;
}

/**
 * The three numbers the Team screen shows for each person.
 *
 * Counted BY THE DATABASE. The alternative is fetching every task and counting
 * in JavaScript, which sends the whole table over the network to produce a
 * handful of numbers, and gets slower with every task added. These aggregations
 * send back one small row per person no matter how large the collection grows.
 *
 * Deliberately NOT part of GET /api/users. That route feeds the assignee
 * dropdown in the filter bar and the edit form, and neither shows a count —
 * making every dropdown run three aggregations would be a cost paid on screens
 * that never use the answer.
 */
export async function listUserStats(): Promise<UserStats[]> {
  // Four groupings in parallel: one round trip's worth of waiting, not four.
  const [assigned, open, created, lastActive] = await Promise.all([
    // Unassigned tasks group under _id: null, which matches no user and is
    // simply never looked up below.
    TaskModel.aggregate<{ _id: Types.ObjectId | null; count: number }>([
      { $group: { _id: "$assigneeId", count: { $sum: 1 } } },
    ]),
    // The same grouping with the finished ones thrown away first. $match comes
    // before $group so the database narrows the set once rather than counting
    // everything and subtracting afterwards.
    TaskModel.aggregate<{ _id: Types.ObjectId | null; count: number }>([
      { $match: { status: { $ne: "done" } } },
      { $group: { _id: "$assigneeId", count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: "$creatorId", count: { $sum: 1 } } },
    ]),
    ActivityModel.aggregate<{ _id: Types.ObjectId; last: Date }>([
      { $group: { _id: "$actorId", last: { $max: "$createdAt" } } },
    ]),
  ]);

  const assignedBy = toMap(assigned, (row) => row.count);
  const openBy = toMap(open, (row) => row.count);
  const createdBy = toMap(created, (row) => row.count);
  const lastActiveBy = toMap(lastActive, (row) => row.last);

  // Driven by the user list, not by the aggregations. Somebody who has never
  // been assigned anything has no row in any of the three, and must still
  // appear on the Team screen with a real zero.
  const users = await UserModel.find({}, { _id: 1 }).lean();

  return users.map((user) => {
    const id = user._id.toString();

    return {
      userId: id,
      assigned: (assignedBy.get(id) as number) ?? 0,
      open: (openBy.get(id) as number) ?? 0,
      created: (createdBy.get(id) as number) ?? 0,
      // null, not a date, when they have never touched anything. The screen
      // says "Never" — inventing a timestamp would be worse than saying so.
      lastActiveAt: (lastActiveBy.get(id) as Date | undefined)?.toISOString() ?? null,
    };
  });
}

function toMap<Row extends { _id: Types.ObjectId | null }, Value>(
  rows: Row[],
  pick: (row: Row) => Value,
): Map<string, Value> {
  return new Map(
    rows
      .filter((row) => row._id !== null)
      .map((row) => [row._id!.toString(), pick(row)]),
  );
}

/**
 * Invite somebody. Admin only — the controller checks that before calling this.
 *
 * The invited person is created immediately, with a role, no password and
 * status "invited". They exist on the Team screen from that moment, which is
 * the point: an invitation you cannot see is one you send twice.
 *
 * The token is the SAME machinery as a password reset — random bytes emailed,
 * only the hash stored, single use, one hour. Reused rather than copied,
 * because a second implementation of a security-critical thing is a second
 * chance to get it wrong. See docs/decisions/0022-invitations.md.
 */
export async function invite(
  email: string,
  name: string,
  role: UserRole,
): Promise<void> {
  const { seatsRemaining } = await getWorkspace();

  if (seatsRemaining <= 0) {
    throw new AppError(
      409,
      "NO_SEATS_REMAINING",
      "This workspace has no seats left. Free one up before inviting anybody else.",
    );
  }

  const existing = await UserModel.findOne({ email });

  // Somebody who has already accepted. Unlike forgot-password, saying so here
  // is fine: whoever is inviting can already see the full member list, so this
  // reveals nothing they do not have on screen.
  if (existing && existing.status === "active") {
    throw new AppError(409, "EMAIL_TAKEN", "That person is already a member");
  }

  const token = createResetToken();

  // Re-inviting somebody who never accepted replaces their token rather than
  // making a second account. Their old link stops working, which is correct —
  // the newest invitation is the one that counts.
  const user =
    existing ??
    new UserModel({ email, name, role, status: "invited", passwordHash: undefined });

  user.name = name;
  user.role = role;
  user.passwordResetTokenHash = token.hash;
  user.passwordResetExpiresAt = token.expiresAt;
  await user.save();

  const link = `${env.APP_URL}/accept-invite?token=${token.raw}`;

  try {
    await sendMail(inviteEmail(user.email, user.name, link));
  } catch (error) {
    // The record and the token are already saved, so the invitation exists and
    // can be resent. Failing the request would leave a half-made member behind.
    console.error(`[users] could not send invite to ${user.email}`, error);
  }
}

/** Swap an invitation token for a password. Turns "invited" into "active". */
export async function acceptInvite(
  rawToken: string,
  password: string,
): Promise<void> {
  const invalid = new AppError(
    400,
    "INVALID_INVITE_TOKEN",
    "This invitation is invalid or has expired. Ask for a new one.",
  );

  const user = await UserModel.findOne({
    status: "invited",
    passwordResetTokenHash: hashResetToken(rawToken),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) throw invalid;

  user.passwordHash = await hashPassword(password);
  user.status = "active";
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.passwordChangedAt = new Date();

  await user.save();
}

/**
 * Change somebody's role. Admin only — the route puts requireAdmin in front.
 *
 * The one guard that matters: THE LAST ADMIN CANNOT BE DEMOTED. Without it a
 * workspace can lock itself out of role management permanently, with no way
 * back that does not involve a database console.
 */
export async function changeRole(
  targetId: string,
  role: UserRole,
): Promise<void> {
  const target = await UserModel.findById(targetId);

  if (!target) throw AppError.notFound("User not found");

  if (target.role === "admin" && role !== "admin") {
    await assertNotTheLastAdmin(target._id);
  }

  target.role = role;
  await target.save();
}

/**
 * Remove somebody from the workspace.
 *
 * THEIR TASKS ARE UNASSIGNED, NOT DELETED. Work outlives the person who happened
 * to be holding it, and deleting a leaver's tasks would quietly destroy the
 * team's data at the moment somebody changes job. Their comments and activity
 * keep their author id, so the trail still reads correctly — the rows say what
 * happened, which is still true after they have gone.
 */
export async function removeMember(
  targetId: string,
  requesterId: Types.ObjectId,
): Promise<void> {
  const target = await UserModel.findById(targetId);

  if (!target) throw AppError.notFound("User not found");

  // An accident with no undo. Anybody wanting to leave can be removed by
  // somebody else, which also means a second person knows it happened.
  if (target._id.equals(requesterId)) {
    throw new AppError(
      400,
      "CANNOT_REMOVE_YOURSELF",
      "You cannot remove yourself from the workspace",
    );
  }

  if (target.role === "admin") {
    await assertNotTheLastAdmin(target._id);
  }

  await Promise.all([
    target.deleteOne(),
    // Hand the work back rather than letting it point at somebody who is gone.
    TaskModel.updateMany({ assigneeId: target._id }, { $set: { assigneeId: null } }),
  ]);
}

async function assertNotTheLastAdmin(targetId: Types.ObjectId): Promise<void> {
  const otherAdmins = await UserModel.countDocuments({
    role: "admin",
    _id: { $ne: targetId },
  });

  if (otherAdmins === 0) {
    throw new AppError(
      409,
      "LAST_ADMIN",
      "This is the only admin. Make somebody else an admin first.",
    );
  }
}

/** Settings → Profile. Only ever the signed-in person's own record. */
export async function updateProfile(
  userId: Types.ObjectId,
  changes: {
    name?: string;
    role?: UserRole;
    timezone?: string | null;
    notifyOnAssignment?: boolean;
    notifyOnMention?: boolean;
  },
) {
  // Email is deliberately absent. Changing it would need a verification round
  // trip to prove the new address belongs to them, and email verification is
  // still on the exclusion list — so the field is shown locked on screen.
  const user = await UserModel.findByIdAndUpdate(userId, changes, {
    new: true,
    runValidators: true,
  });

  if (!user) throw AppError.notFound("User not found");

  return user;
}
