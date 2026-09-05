import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
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
  ]);

  const a = await request(app).post("/api/auth/register").send(userA);
  const b = await request(app).post("/api/auth/register").send(userB);

  cookieA = cookieFor(a);
  cookieB = cookieFor(b);
  idA = a.body.user._id;
  idB = b.body.user._id;
});

function createTask(cookie: string, body: Record<string, unknown> = {}) {
  return request(app)
    .post("/api/tasks")
    .set("Cookie", cookie)
    .send({ title: "Fix payment webhook issue", ...body });
}

describe("POST /api/tasks", () => {
  it("creates a task with the design's defaults and a generated key", async () => {
    const response = await createTask(cookieA);

    expect(response.status).toBe(201);
    expect(response.body.task.title).toBe("Fix payment webhook issue");
    expect(response.body.task.status).toBe("todo");
    expect(response.body.task.priority).toBe("medium");
    expect(response.body.task.key).toMatch(/^TF-\d+$/);
  });

  it("is 401 without a login", async () => {
    const response = await request(app)
      .post("/api/tasks")
      .send({ title: "Should not exist" });

    expect(response.status).toBe(401);
    expect(await TaskModel.countDocuments({})).toBe(0);
  });

  it("names the missing field when there is no title", async () => {
    const response = await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ description: "no title here" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields[0].field).toBe("title");
  });

  it("ignores creatorId in the body and saves the logged-in person", async () => {
    const response = await createTask(cookieA, { creatorId: idB });

    expect(response.status).toBe(201);
    expect(response.body.task.creatorId._id).toBe(idA);

    // Read the saved record, not just the reply.
    const saved = await TaskModel.findById(response.body.task._id);
    expect(saved!.creatorId.toString()).toBe(idA);
    expect(saved!.creatorId.toString()).not.toBe(idB);
  });

  it("ignores key in the body and uses the generated one", async () => {
    const response = await createTask(cookieA, { key: "TF-9999" });

    expect(response.status).toBe(201);
    expect(response.body.task.key).not.toBe("TF-9999");
    expect(response.body.task.key).toBe("TF-1");
  });

  it("accepts every status and priority the design lists", async () => {
    const response = await createTask(cookieA, {
      status: "in_review",
      priority: "urgent",
    });

    expect(response.status).toBe(201);
    expect(response.body.task.status).toBe("in_review");
    expect(response.body.task.priority).toBe("urgent");
  });

  it("rejects a status that is not one of the five", async () => {
    const response = await createTask(cookieA, { status: "done_ish" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a due date in the past, in the design's exact words", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const response = await createTask(cookieA, {
      dueDate: yesterday.toISOString(),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Due date can't be in the past.");
  });

  it("accepts today as a due date", async () => {
    const response = await createTask(cookieA, {
      dueDate: new Date().toISOString(),
    });

    expect(response.status).toBe(201);
  });

  it("is 422 when the assignee id is well formed but nobody has it", async () => {
    const response = await createTask(cookieA, {
      assigneeId: "000000000000000000000000",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("ASSIGNEE_NOT_FOUND");
    expect(await TaskModel.countDocuments({})).toBe(0);
  });

  it("returns the assignee's name, not just an id", async () => {
    const response = await createTask(cookieA, { assigneeId: idB });

    expect(response.status).toBe(201);
    expect(response.body.task.assigneeId.name).toBe(userB.name);
    expect(response.body.task.assigneeId.email).toBe(userB.email);
  });

  // The adversarial one. This is the only check that proves the counter is
  // atomic rather than merely looking atomic when called one at a time.
  it("gives twenty tasks created at once twenty different keys", async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createTask(cookieA, { title: `Concurrent task ${i}` }),
      ),
    );

    expect(responses.every((r) => r.status === 201)).toBe(true);

    const keys = responses.map((r) => r.body.task.key);
    expect(new Set(keys).size).toBe(20);

    const distinct = await TaskModel.distinct("key");
    expect(distinct).toHaveLength(20);
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns the task with both people filled in", async () => {
    const created = await createTask(cookieA, { assigneeId: idB });

    const response = await request(app)
      .get(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);
    expect(response.body.task.creatorId.name).toBe(userA.name);
    expect(response.body.task.assigneeId.name).toBe(userB.name);
  });

  it("is 400 for a malformed id, not 500", async () => {
    const response = await request(app)
      .get("/api/tasks/not-a-real-id")
      .set("Cookie", cookieA);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_ID");
  });

  it("is 404 for an id that is well formed but has no task", async () => {
    const response = await request(app)
      .get("/api/tasks/000000000000000000000000")
      .set("Cookie", cookieA);

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("lets someone who did not create the task change its status", async () => {
    const created = await createTask(cookieA);

    const response = await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieB)
      .send({ status: "in_progress" });

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe("in_progress");
  });

  it("changes only the fields sent", async () => {
    const created = await createTask(cookieA, { priority: "high" });

    const response = await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA)
      .send({ status: "done" });

    expect(response.body.task.status).toBe("done");
    expect(response.body.task.priority).toBe("high");
    expect(response.body.task.title).toBe("Fix payment webhook issue");
  });

  it("cannot be used to change who created the task", async () => {
    const created = await createTask(cookieA);

    const response = await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieB)
      .send({ creatorId: idB, status: "blocked" });

    expect(response.status).toBe(200);
    expect(response.body.task.creatorId._id).toBe(idA);

    const saved = await TaskModel.findById(created.body.task._id);
    expect(saved!.creatorId.toString()).toBe(idA);
  });

  it("cannot be used to change the key", async () => {
    const created = await createTask(cookieA);
    const originalKey = created.body.task.key;

    await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA)
      .send({ key: "TF-9999", status: "done" });

    const saved = await TaskModel.findById(created.body.task._id);
    expect(saved!.key).toBe(originalKey);
  });

  it("rejects an empty body rather than silently doing nothing", async () => {
    const created = await createTask(cookieA);

    const response = await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA)
      .send({});

    expect(response.status).toBe(400);
  });

  it("allows a past due date on edit, unlike on create", async () => {
    const created = await createTask(cookieA);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const response = await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA)
      .send({ dueDate: yesterday.toISOString() });

    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("lets the creator delete their own task", async () => {
    const created = await createTask(cookieA);

    const response = await request(app)
      .delete(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(204);
    expect(await TaskModel.countDocuments({})).toBe(0);
  });

  it("answers 404 to someone else, and leaves the task alone", async () => {
    const created = await createTask(cookieA);

    const response = await request(app)
      .delete(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieB);

    // 404 and not 403: a 403 would confirm the id exists, which lets someone
    // map real ids by probing.
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");

    const stillThere = await TaskModel.findById(created.body.task._id);
    expect(stillThere).not.toBeNull();
  });

  it("is 401 without a login", async () => {
    const created = await createTask(cookieA);

    const response = await request(app).delete(
      `/api/tasks/${created.body.task._id}`,
    );

    expect(response.status).toBe(401);
    expect(await TaskModel.countDocuments({})).toBe(1);
  });
});
