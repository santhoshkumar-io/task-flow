import { Schema, model, type HydratedDocument, type Types } from "mongoose";

// Comments live in their own collection rather than inside the task.
//
// A single MongoDB record can never exceed 16 MB, and comments have no natural
// end — one busy task can collect hundreds. You also cannot page through a list
// that lives inside a record: showing comments 20 to 40 would mean loading the
// whole task, every comment included, and throwing away the rest.
//
// See docs/decisions/0008-comments-own-collection.md.

export interface Comment {
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentDocument = HydratedDocument<Comment>;

const commentSchema = new Schema<Comment>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      // Loading one task's comments is the only way this collection is ever
      // read, so this is the index that matters.
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      // The design's compose box shows a 0 / 2000 counter.
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const CommentModel = model<Comment>("Comment", commentSchema);
