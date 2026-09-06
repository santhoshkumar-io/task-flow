import { Schema, model, type HydratedDocument } from "mongoose";

// One document, holding the things that belong to the workspace rather than to
// a person. Today that is only its name.
//
// A collection with a single row looks odd, and the alternative was worse: the
// design's Settings → Workspace tab has a name field, and a text box that saves
// nowhere is a control pretending to be a setting. An environment variable
// would make it read-only, which is not what the screen draws.
//
// Not a "workspaces" feature. There is exactly one, and nothing in this
// application takes a workspace id — grouping tasks by workspace is on the
// plan's exclusion list and stays there.

export interface Workspace {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceDocument = HydratedDocument<Workspace>;

const workspaceSchema = new Schema<Workspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
      default: "TaskFlow",
    },
  },
  { timestamps: true },
);

export const WorkspaceModel = model<Workspace>("Workspace", workspaceSchema);

/**
 * The one document, created on first read.
 *
 * upsert rather than a check-then-insert: two requests arriving together would
 * both find nothing and both insert, and there is no unique index to catch it
 * because there is no field to make unique.
 */
export async function getWorkspaceDoc(): Promise<WorkspaceDocument> {
  return WorkspaceModel.findOneAndUpdate(
    {},
    { $setOnInsert: { name: "TaskFlow" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
