import { Types } from "mongoose";
import { ActivityModel } from "../../models/activity.model.js";
import { TaskModel } from "../../models/task.model.js";
import { UserModel } from "../../models/user.model.js";

// Only the three fields the assignee dropdown needs. Not "everything except
// the hash" — an explicit list cannot accidentally start returning a field
// somebody adds to the model later.
export async function listUsers() {
  return UserModel.find({}, { name: 1, email: 1 }).sort({ name: 1 }).lean();
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
