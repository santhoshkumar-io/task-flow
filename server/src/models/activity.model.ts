import { Schema, model, type HydratedDocument, type Types } from "mongoose";

// The record of who changed what on a task. The design draws this as the
// Activity card in the right rail of the task detail screen.
//
// It matters here more than it would elsewhere: anyone logged in may edit any
// task (see docs/decisions/0006-anyone-edits-creator-deletes.md), so without
// this there is no trace of who moved something to Done.

export const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "assignee_changed",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface Activity {
  taskId: Types.ObjectId;
  actorId: Types.ObjectId;
  type: ActivityType;
  // Stored as plain text rather than a typed field per kind of change, because
  // one row has to describe "todo → in_progress" and "nobody → Sarah Chen"
  // equally well. null means there was no previous value.
  from: string | null;
  to: string | null;
  createdAt: Date;
}

export type ActivityDocument = HydratedDocument<Activity>;

const activitySchema = new Schema<Activity>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  {
    // Only createdAt. An activity row describes a moment that already happened,
    // so there is nothing for updatedAt to mean.
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const ActivityModel = model<Activity>("Activity", activitySchema);
