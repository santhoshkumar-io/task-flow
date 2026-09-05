import { Schema, model } from "mongoose";

// One record per thing being counted. Today there is exactly one:
// { _id: "taskKey", seq: 117 }.

export interface Counter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<Counter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel = model<Counter>("Counter", counterSchema);

const TASK_KEY_COUNTER = "taskKey";

// The whole point of this file is that it is ONE database operation.
//
// Counting the existing tasks and adding one would be two: a read, then a
// write. Two people creating a task at the same moment would both read 117,
// both compute 118, and both try to save TF-118.
//
// $inc asks the database to do the arithmetic itself, and
// returnDocument: "after" asks for the value it landed on. A single document
// update is atomic in MongoDB, so there is no gap for a second request to slip
// into — because there is no read to slip in front of.
//
// upsert: true creates the record on the very first call, so nothing has to be
// seeded by hand before the first task is made.
export async function nextTaskKey(): Promise<string> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: TASK_KEY_COUNTER },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  return `TF-${counter.seq}`;
}
