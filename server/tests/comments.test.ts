import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
import { ActivityModel } from "../src/models/activity.model.js";
import { CommentModel } from "../src/models/comment.model.js";
import { CounterModel } from "../src/models/counter.model.js";
import { TaskModel } from "../src/models/task.model.js";
import { UserModel } from "../src/models/user.model.js";

const app = createApp();

const userA = {
  name: "Alice Chen",
  email: "alice@taskflow.test",
  password: "correct-horse-battery",
};

const userB = {
  name: "Ben Ortiz",
  email: "ben@taskflow.test",
  password: "another-good-password",
};

let cookieA = "";
let cookieB = "";
let idA = "";
let idB = "";
let taskId = "";

function cookieFor(response: request.Response): string {
  const raw = response.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) throw new Error("no auth cookie on the response");
  return cookie;
}

beforeEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    TaskModel.deleteMany({}),
    CounterModel.deleteMany({}),
    CommentModel.deleteMany({}),
    ActivityModel.deleteMany({}),
  ]);

  const a = await request(app).post("/api/auth/register").send(userA);
  const b = await request(app).post("/api/auth/register").send(userB);
  cookieA = cookieFor(a);
  cookieB = cookieFor(b);
  idA = a.body.user._id;
  idB = b.body.user._id;

  const task = await request(app)
    .post("/api/tasks")
    .set("Cookie", cookieA)
    .send({ title: "Fix payment webhook issue" });

  taskId = task.body.task._id;
});

function postComment(body: string, cookie = cookieA) {
  return request(app)
    .post(`/api/tasks/${taskId}/comments`)
    .set("Cookie", cookie)
    .send({ body });
}

const MISSING_TASK = "000000000000000000000000";

describe("POST /api/tasks/:taskId/comments", () => {
  it("saves the comment and fills in the author's name", async () => {
    const response = await postComment("Reproduced on Safari 17.");

    expect(response.status).toBe(201);
    expect(response.body.comment.body).toBe("Reproduced on Safari 17.");
    expect(response.body.comment.authorId.name).toBe(userA.name);
    expect(response.body.comment.authorId.email).toBe(userA.email);
  });

  it("is 401 without a login", async () => {
    const response = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: "Should not be saved" });

    expect(response.status).toBe(401);
    expect(await CommentModel.countDocuments({})).toBe(0);
  });

  it("is 404 for a task that does not exist, and creates nothing", async () => {
    const response = await request(app)
      .post(`/api/tasks/${MISSING_TASK}/comments`)
      .set("Cookie", cookieA)
      .send({ body: "An orphan waiting to happen" });

    expect(response.status).toBe(404);

    // The point of the check: without it this would be a comment pointing at a
    // task that does not exist, which no screen could ever show.
    expect(await CommentModel.countDocuments({})).toBe(0);
  });

  it("is 400 for a malformed task id, not 500", async () => {
    const response = await request(app)
      .post("/api/tasks/not-a-real-id/comments")
      .set("Cookie", cookieA)
      .send({ body: "Hello" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_ID");
  });

  it("refuses an empty comment", async () => {
    const response = await postComment("");

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Comment can't be empty");
    expect(await CommentModel.countDocuments({})).toBe(0);
  });

  it("refuses a comment of only spaces", async () => {
    const response = await postComment("     ");

    expect(response.status).toBe(400);
    expect(await CommentModel.countDocuments({})).toBe(0);
  });

  it("refuses a comment longer than the design's 2000 limit", async () => {
    const response = await postComment("x".repeat(2001));

    expect(response.status).toBe(400);
    expect(await CommentModel.countDocuments({})).toBe(0);
  });

  it("accepts exactly 2000 characters", async () => {
    const response = await postComment("x".repeat(2000));
    expect(response.status).toBe(201);
  });

  it("ignores an authorId sent in the body", async () => {
    const response = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set("Cookie", cookieA)
      .send({ body: "Trying to post as Ben", authorId: idB });

    expect(response.status).toBe(201);
    expect(response.body.comment.authorId.name).toBe(userA.name);
  });
});

describe("GET /api/tasks/:taskId/comments", () => {
  it("returns them oldest first, so a conversation reads top to bottom", async () => {
    await postComment("First message");
    await postComment("Second message", cookieB);
    await postComment("Third message");

    const response = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);
    expect(response.body.comments.map((c: { body: string }) => c.body)).toEqual([
      "First message",
      "Second message",
      "Third message",
    ]);
    expect(response.body.comments[1].authorId.name).toBe(userB.name);
  });

  it("is empty for a task nobody has commented on", async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set("Cookie", cookieA);

    expect(response.body.comments).toEqual([]);
  });

  it("is 404 for a task that does not exist", async () => {
    const response = await request(app)
      .get(`/api/tasks/${MISSING_TASK}/comments`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(404);
  });

  it("is 401 without a login", async () => {
    const response = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(response.status).toBe(401);
  });
});

describe("GET /api/tasks/:id carries a comment count", () => {
  it("counts the comments, so the delete dialog can name a real number", async () => {
    await postComment("One");
    await postComment("Two");
    await postComment("Three");

    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);
    expect(response.body.commentCount).toBe(3);
    expect(response.body.commentCount).toBe(
      await CommentModel.countDocuments({ taskId }),
    );
  });

  it("is zero for a task with no comments", async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA);

    expect(response.body.commentCount).toBe(0);
  });
});

describe("deleting a task takes its comments and activity with it", () => {
  it("leaves nothing behind", async () => {
    await postComment("One");
    await postComment("Two");
    await postComment("Three");

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ status: "in_progress" });

    // Before: three comments, and activity from the create plus the edit.
    expect(await CommentModel.countDocuments({ taskId })).toBe(3);
    expect(await ActivityModel.countDocuments({ taskId })).toBe(2);

    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(204);

    // After: nothing. MongoDB does not do this for us.
    expect(await TaskModel.countDocuments({ _id: taskId })).toBe(0);
    expect(await CommentModel.countDocuments({ taskId })).toBe(0);
    expect(await ActivityModel.countDocuments({ taskId })).toBe(0);
  });

  it("leaves another task's comments alone", async () => {
    await postComment("On the first task");

    const other = await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "A different task" });

    await request(app)
      .post(`/api/tasks/${other.body.task._id}/comments`)
      .set("Cookie", cookieA)
      .send({ body: "On the second task" });

    await request(app).delete(`/api/tasks/${taskId}`).set("Cookie", cookieA);

    expect(await CommentModel.countDocuments({})).toBe(1);
    expect(
      await CommentModel.countDocuments({ taskId: other.body.task._id }),
    ).toBe(1);
  });

  it("does not run when the delete is refused", async () => {
    await postComment("Still here afterwards");

    // User B did not create this task, so the delete is a 404.
    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Cookie", cookieB);

    expect(response.status).toBe(404);
    expect(await CommentModel.countDocuments({ taskId })).toBe(1);
  });
});

describe("the activity trail", () => {
  async function activityFor(id = taskId) {
    const response = await request(app)
      .get(`/api/tasks/${id}/activity`)
      .set("Cookie", cookieA);
    return response;
  }

  it("records one row when a task is created", async () => {
    const response = await activityFor();

    expect(response.status).toBe(200);
    expect(response.body.activity).toHaveLength(1);
    expect(response.body.activity[0].type).toBe("created");
    expect(response.body.activity[0].actorId.name).toBe(userA.name);
  });

  it("records exactly one row for a status change, holding both values", async () => {
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ status: "in_progress" });

    const rows = await ActivityModel.find({ taskId, type: "status_changed" });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.from).toBe("todo");
    expect(rows[0]!.to).toBe("in_progress");
  });

  it("records nothing when only the title changes", async () => {
    const before = await ActivityModel.countDocuments({ taskId });

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ title: "A completely new title" });

    expect(await ActivityModel.countDocuments({ taskId })).toBe(before);
  });

  it("records nothing when a field is set to the value it already had", async () => {
    const before = await ActivityModel.countDocuments({ taskId });

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ status: "todo" });

    expect(await ActivityModel.countDocuments({ taskId })).toBe(before);
  });

  it("records two rows when two fields change at once", async () => {
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ status: "blocked", priority: "urgent" });

    const rows = await ActivityModel.find({
      taskId,
      type: { $in: ["status_changed", "priority_changed"] },
    });

    expect(rows).toHaveLength(2);
  });

  it("records who was assigned, and who did it", async () => {
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieB)
      .send({ assigneeId: idB });

    const rows = await ActivityModel.find({ taskId, type: "assignee_changed" });

    expect(rows).toHaveLength(1);
    // from is null because nobody was assigned before.
    expect(rows[0]!.from).toBeNull();
    expect(rows[0]!.to).toBe(idB);

    // The actor is whoever sent the request, not whoever created the task.
    // User A created it; user B made this change.
    expect(rows[0]!.actorId.toString()).toBe(idB);
    expect(rows[0]!.actorId.toString()).not.toBe(idA);
  });

  it("records unassigning as a change back to nobody", async () => {
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ assigneeId: idB });

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ assigneeId: null });

    const rows = await ActivityModel.find({
      taskId,
      type: "assignee_changed",
    }).sort({ createdAt: 1 });

    expect(rows).toHaveLength(2);
    expect(rows[1]!.from).toBe(idB);
    expect(rows[1]!.to).toBeNull();
  });

  it("returns newest first", async () => {
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set("Cookie", cookieA)
      .send({ status: "in_progress" });

    const response = await activityFor();

    expect(response.body.activity[0].type).toBe("status_changed");
    expect(response.body.activity.at(-1).type).toBe("created");
  });

  it("is 404 for a task that does not exist", async () => {
    const response = await activityFor(MISSING_TASK);
    expect(response.status).toBe(404);
  });

  it("is 401 without a login", async () => {
    const response = await request(app).get(`/api/tasks/${taskId}/activity`);
    expect(response.status).toBe(401);
  });
});

describe("PATCH and DELETE /api/tasks/:taskId/comments/:commentId", () => {
  /** Posts a comment and hands back its id. */
  async function commentId(body: string, cookie = cookieA) {
    const response = await postComment(body, cookie);
    return response.body.comment._id as string;
  }

  it("lets the author edit their own comment", async () => {
    const id = await commentId("First thought");

    const response = await request(app)
      .patch(`/api/tasks/${taskId}/comments/${id}`)
      .set("Cookie", cookieA)
      .send({ body: "Second thought" });

    expect(response.status).toBe(200);
    expect(response.body.comment.body).toBe("Second thought");
    // Still the author's own name on it — editing does not reassign it.
    expect(response.body.comment.authorId.name).toBe(userA.name);
  });

  it("answers 404, not 403, when it is somebody else's comment", async () => {
    const id = await commentId("Alice wrote this");

    const response = await request(app)
      .patch(`/api/tasks/${taskId}/comments/${id}`)
      .set("Cookie", cookieB)
      .send({ body: "Ben rewriting it" });

    // 404 rather than 403, for the same reason deleting somebody else's task
    // does: a 403 would confirm the comment exists. See docs/decisions/0006.
    expect(response.status).toBe(404);

    // And nothing changed.
    const after = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set("Cookie", cookieA);
    expect(after.body.comments[0].body).toBe("Alice wrote this");
  });

  it("lets the author delete their own comment", async () => {
    const id = await commentId("Never mind");

    const response = await request(app)
      .delete(`/api/tasks/${taskId}/comments/${id}`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(204);
    expect(await CommentModel.countDocuments({})).toBe(0);
  });

  it("answers 404 when deleting somebody else's comment, and keeps it", async () => {
    const id = await commentId("Alice wrote this");

    const response = await request(app)
      .delete(`/api/tasks/${taskId}/comments/${id}`)
      .set("Cookie", cookieB);

    expect(response.status).toBe(404);
    expect(await CommentModel.countDocuments({})).toBe(1);
  });

  it("will not reach a comment through a different task's URL", async () => {
    const id = await commentId("Belongs to the first task");

    const other = await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "A second task" });

    // The taskId is part of the lookup, so a real comment id under the wrong
    // task matches nothing at all.
    const response = await request(app)
      .patch(`/api/tasks/${other.body.task._id}/comments/${id}`)
      .set("Cookie", cookieA)
      .send({ body: "Moved?" });

    expect(response.status).toBe(404);
  });

  it("applies the same body rules as posting", async () => {
    const id = await commentId("Fine");

    const response = await request(app)
      .patch(`/api/tasks/${taskId}/comments/${id}`)
      .set("Cookie", cookieA)
      .send({ body: "   " });

    // An edit must not be a way past the rule that a comment has content.
    expect(response.status).toBe(400);
  });
});
