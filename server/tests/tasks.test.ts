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

describe("GET /api/tasks — the list", () => {
  // A small fixed set so every assertion below can name a specific task.
  async function seedSix() {
    const rows: [string, string, string, boolean][] = [
      ["Fix login bug", "todo", "high", false],
      ["Add password reset", "todo", "low", true],
      ["Design review", "in_review", "urgent", true],
      ["Upgrade Node", "in_progress", "medium", false],
      ["Archive old pages", "done", "low", true],
      ["Timezone bug in due dates", "blocked", "urgent", false],
    ];

    for (const [title, status, priority, assigned] of rows) {
      await createTask(cookieA, {
        title,
        status,
        priority,
        ...(assigned ? { assigneeId: idB } : {}),
      });
    }
  }

  function list(query: string, cookie = cookieA) {
    return request(app).get(`/api/tasks${query}`).set("Cookie", cookie);
  }

  it("is 401 without a login", async () => {
    const response = await request(app).get("/api/tasks");
    expect(response.status).toBe(401);
  });

  it("returns the page shape the design's pager needs", async () => {
    await seedSix();
    const response = await list("");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      limit: 20,
      total: 6,
      totalPages: 1,
      hasMore: false,
    });
    expect(response.body.items).toHaveLength(6);
  });

  it("pages without repeating anything", async () => {
    await seedSix();

    const first = await list("?page=1&limit=3");
    const second = await list("?page=2&limit=3");

    expect(first.body.items).toHaveLength(3);
    expect(second.body.items).toHaveLength(3);
    expect(first.body.total).toBe(6);
    expect(second.body.total).toBe(6);
    expect(first.body.hasMore).toBe(true);
    expect(second.body.hasMore).toBe(false);

    const firstIds = first.body.items.map((t: { _id: string }) => t._id);
    const secondIds = second.body.items.map((t: { _id: string }) => t._id);
    expect(
      firstIds.filter((id: string) => secondIds.includes(id)),
    ).toHaveLength(0);
  });

  it("filters by status", async () => {
    await seedSix();
    const response = await list("?status=todo");

    expect(response.body.total).toBe(2);
    expect(
      response.body.items.every((t: { status: string }) => t.status === "todo"),
    ).toBe(true);
  });

  it("filters by status and priority together", async () => {
    await seedSix();
    const response = await list("?status=todo&priority=high");

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].title).toBe("Fix login bug");
  });

  it("accepts the design's less common status and priority", async () => {
    await seedSix();
    const response = await list("?status=in_review&priority=urgent");

    expect(response.status).toBe(200);
    expect(response.body.items[0].title).toBe("Design review");
  });

  it("finds a partial word, which a text index could not", async () => {
    await seedSix();
    const response = await list("?q=log");

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].title).toBe("Fix login bug");
  });

  it("finds a task by its short key", async () => {
    await seedSix();
    const all = await list("");
    const key = all.body.items[0].key;

    const response = await list(`?q=${key}`);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].key).toBe(key);
  });

  it("treats search text as text, not as a pattern", async () => {
    await seedSix();
    // Unescaped, ".*" would match every task. Escaped, it matches none.
    const response = await list("?q=.*");

    expect(response.body.total).toBe(0);
  });

  it("finds the tasks nobody is assigned to", async () => {
    await seedSix();
    const response = await list("?assigneeId=unassigned");

    expect(response.body.total).toBe(3);
    expect(
      response.body.items.every(
        (t: { assigneeId: unknown }) => t.assigneeId === null,
      ),
    ).toBe(true);
  });

  it("finds the tasks assigned to one person", async () => {
    await seedSix();
    const response = await list(`?assigneeId=${idB}`);

    expect(response.body.total).toBe(3);
  });

  it("sorts by real priority order, not alphabetically", async () => {
    await seedSix();
    const response = await list("?sort=priority&order=desc");

    const priorities = response.body.items.map(
      (t: { priority: string }) => t.priority,
    );
    expect(priorities[0]).toBe("urgent");
    expect(priorities.at(-1)).toBe("low");

    // Alphabetically this would come out high, low, low, medium, urgent, urgent.
    expect(priorities).not.toEqual([...priorities].sort());
  });

  it("keeps priorityRank in step when a task is edited", async () => {
    const created = await createTask(cookieA, { priority: "low" });

    await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieA)
      .send({ priority: "urgent" });

    const saved = await TaskModel.findById(created.body.task._id);
    expect(saved!.priority).toBe("urgent");
    expect(saved!.priorityRank).toBe(4);
  });

  it("refuses a limit above the cap", async () => {
    const response = await list("?limit=500");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields[0].field).toBe("limit");
  });

  it("refuses a status that is not one of the five", async () => {
    const response = await list("?status=nonsense");

    expect(response.status).toBe(400);
    expect(response.body.error.fields[0].field).toBe("status");
  });

  it("refuses a sort field that is not on the allow-list", async () => {
    const response = await list("?sort=passwordHash");

    expect(response.status).toBe(400);
  });

  // The adversarial one. Express turns ?status[$ne]=done into an OBJECT, and
  // passed into the query it would invert the filter and return every task
  // that is NOT done.
  it("refuses an object where a status was expected", async () => {
    await seedSix();
    const response = await list("?status[$ne]=done");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.items).toBeUndefined();
  });

  it("refuses an object where an assignee id was expected", async () => {
    const response = await list("?assigneeId[$ne]=null");
    expect(response.status).toBe(400);
  });
});

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

describe("GET /api/tasks/stats", () => {
  it("is matched by a direct count of the collection", async () => {
    for (const status of ["todo", "todo", "in_progress", "done", "blocked"]) {
      await createTask(cookieA, { title: `Task ${status}`, status });
    }

    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);

    // Check both, trust neither alone.
    expect(response.body.stats).toEqual({
      total: await TaskModel.countDocuments({}),
      todo: await TaskModel.countDocuments({ status: "todo" }),
      inProgress: await TaskModel.countDocuments({ status: "in_progress" }),
      done: await TaskModel.countDocuments({ status: "done" }),
      // Counted here the same way the service counts it: has a due date, that
      // date is before the start of today, and it is not finished.
      overdue: await TaskModel.countDocuments({
        dueDate: { $ne: null, $lt: startOfToday() },
        status: { $ne: "done" },
      }),
    });
  });

  it("is not mistaken for a task id", async () => {
    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    // Registered below /:id, this would be 400 INVALID_ID instead.
    expect(response.status).toBe(200);
    expect(response.body.stats).toBeDefined();
  });

  it("is 401 without a login", async () => {
    const response = await request(app).get("/api/tasks/stats");
    expect(response.status).toBe(401);
  });
});
