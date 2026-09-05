import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/lib/cookie.js";
import { ActivityModel } from "../src/models/activity.model.js";
import { CounterModel } from "../src/models/counter.model.js";
import { TaskModel } from "../src/models/task.model.js";
import { UserModel } from "../src/models/user.model.js";

// GET /api/users/stats — the three numbers the Team screen shows per person.
//
// These matter more than most tests, because the whole point of V9 is that no
// number on screen was invented. If this aggregation is wrong, the screen is
// confidently wrong, which is worse than being empty.

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

// Registers but never touches a task — the "Never active" case.
const userC = {
  name: "Cara Novak",
  email: "cara@taskflow.test",
  password: "a-third-good-password",
};

let cookieA = "";
let cookieB = "";
let idA = "";
let idB = "";
let idC = "";

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
    ActivityModel.deleteMany({}),
  ]);

  const a = await request(app).post("/api/auth/register").send(userA);
  const b = await request(app).post("/api/auth/register").send(userB);
  const c = await request(app).post("/api/auth/register").send(userC);

  cookieA = cookieFor(a);
  cookieB = cookieFor(b);
  idA = a.body.user._id;
  idB = b.body.user._id;
  idC = c.body.user._id;
});

function statsFor(body: { stats: { userId: string }[] }, userId: string) {
  const row = body.stats.find((entry) => entry.userId === userId);
  if (!row) throw new Error(`no stats row for ${userId}`);
  return row as {
    userId: string;
    assigned: number;
    open: number;
    created: number;
    lastActiveAt: string | null;
  };
}

/**
 * Creates a task and then moves its due date into the past.
 *
 * It takes two requests because createTaskSchema refuses a past due date on
 * purpose, while updateTaskSchema deliberately does not — an already-overdue
 * task still has to be editable. So this is the only honest way to produce one.
 */
async function taskDueOn(
  cookie: string,
  title: string,
  dueDate: Date | null,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const created = await request(app)
    .post("/api/tasks")
    .set("Cookie", cookie)
    .send({ title, ...extra });

  const id = created.body.task._id as string;

  if (dueDate) {
    await request(app)
      .patch(`/api/tasks/${id}`)
      .set("Cookie", cookie)
      .send({ dueDate: dueDate.toISOString() });
  }

  return id;
}

/** Midnight, N days before today. */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

describe("GET /api/users/stats", () => {
  it("is 401 without a login", async () => {
    const response = await request(app).get("/api/users/stats");

    expect(response.status).toBe(401);
  });

  it("counts created and assigned separately", async () => {
    // A creates two tasks and gives one of them to B.
    await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Kept by Alice" });

    await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Handed to Ben", assigneeId: idB });

    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);

    // Alice made both, and is assigned neither: create does not assign.
    expect(statsFor(response.body, idA).created).toBe(2);
    expect(statsFor(response.body, idA).assigned).toBe(0);

    // Ben made nothing and holds one.
    expect(statsFor(response.body, idB).created).toBe(0);
    expect(statsFor(response.body, idB).assigned).toBe(1);
  });

  it("does not count an unassigned task against anybody", async () => {
    await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Nobody's task" });

    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    // Unassigned tasks group under a null id in the aggregation. If that row
    // leaked into somebody's total, one of these would be 1.
    for (const row of response.body.stats) {
      expect(row.assigned).toBe(0);
    }
  });

  it("includes a person who has done nothing at all, with real zeros", async () => {
    await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Alice's task" });

    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    // Cara has no row in any of the three aggregations. She must still appear:
    // a missing row on the Team screen would look like a missing person.
    const cara = statsFor(response.body, idC);

    expect(cara.assigned).toBe(0);
    expect(cara.created).toBe(0);
    // null, not a date and not an empty string. The screen shows "Never".
    expect(cara.lastActiveAt).toBeNull();
  });

  it("reports lastActiveAt from the newest activity row, per person", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Alice's task" });

    // B changes A's task — allowed, see docs/decisions/0006. That writes an
    // activity row for B, and B has still created nothing.
    await request(app)
      .patch(`/api/tasks/${created.body.task._id}`)
      .set("Cookie", cookieB)
      .send({ status: "in_progress" });

    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    const alice = statsFor(response.body, idA);
    const ben = statsFor(response.body, idB);

    // Both have acted, so both have a timestamp.
    expect(alice.lastActiveAt).not.toBeNull();
    expect(ben.lastActiveAt).not.toBeNull();

    // Ben acted second, so his is the later of the two.
    expect(new Date(ben.lastActiveAt as string).getTime()).toBeGreaterThanOrEqual(
      new Date(alice.lastActiveAt as string).getTime(),
    );

    // And editing somebody else's task is not creating one.
    expect(ben.created).toBe(0);
  });

  it("returns a row for every user, even with no tasks at all", async () => {
    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    expect(response.body.stats).toHaveLength(3);
  });

  it("counts `open` as assigned-and-not-done", async () => {
    // Three for Ben: two unfinished, one already done.
    for (const status of ["todo", "in_review", "done"]) {
      await request(app)
        .post("/api/tasks")
        .set("Cookie", cookieA)
        .send({ title: `Ben's ${status} task`, status, assigneeId: idB });
    }

    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    const ben = statsFor(response.body, idB);

    // assigned counts everything; open leaves out the finished one. If these
    // were equal the badge would be counting work that is already done.
    expect(ben.assigned).toBe(3);
    expect(ben.open).toBe(2);
  });

  it("does not count an unassigned unfinished task against anybody", async () => {
    await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Nobody's unfinished task", status: "todo" });

    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    // The open aggregation groups unassigned tasks under a null id, exactly as
    // the assigned one does. If that row leaked, somebody's badge would count
    // work nobody had been given.
    for (const row of response.body.stats) {
      expect(row.open).toBe(0);
    }
  });

  it("gives somebody with nothing assigned a real zero, not a missing field", async () => {
    const response = await request(app)
      .get("/api/users/stats")
      .set("Cookie", cookieA);

    const cara = statsFor(response.body, idC);

    // 0, not undefined. The sidebar draws no badge when the number is missing,
    // so an undefined here would silently hide a real zero.
    expect(cara.open).toBe(0);
  });
});

describe("GET /api/tasks/stats", () => {
  it("counts by status, and total is every task rather than the sum of the three", async () => {
    // The dashboard shows Total, To Do, In Progress and Done. in_review and
    // blocked are real statuses with no card, so the three named counts are
    // NOT expected to add up to the total. This pins that down so nobody
    // later "fixes" it into a bug.
    for (const status of ["todo", "todo", "in_progress", "done", "blocked"]) {
      await request(app)
        .post("/api/tasks")
        .set("Cookie", cookieA)
        .send({ title: `A ${status} task`, status });
    }

    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);
    expect(response.body.stats).toEqual({
      total: 5,
      todo: 2,
      inProgress: 1,
      done: 1,
      overdue: 0,
    });

    // 2 + 1 + 1 is 4, and the total is 5. The blocked one is the difference.
    const { total, todo, inProgress, done } = response.body.stats;
    expect(todo + inProgress + done).toBeLessThan(total);
  });

  it("counts a task past its due date and not finished as overdue", async () => {
    await taskDueOn(cookieA, "Late and unfinished", daysAgo(3));

    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    expect(response.body.stats.overdue).toBe(1);
  });

  it("never counts a task with no due date as overdue", async () => {
    // A task with no due date is stored as an explicit null, and null sorts
    // before every date in MongoDB's ordering — so this looks like it should
    // match { $lt: <today> } and be reported overdue. It does not, because
    // range operators are type-bracketed: $lt against a date only matches
    // dates. This test is what stops that behaviour being taken on trust.
    for (const title of ["No date one", "No date two", "No date three"]) {
      await request(app)
        .post("/api/tasks")
        .set("Cookie", cookieA)
        .send({ title });
    }

    // Cleared explicitly on one of them as well, since clearing a date and
    // never setting one are different writes.
    const cleared = await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Had a date, then lost it" });

    await request(app)
      .patch(`/api/tasks/${cleared.body.task._id}`)
      .set("Cookie", cookieA)
      .send({ dueDate: null });

    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    expect(response.body.stats.total).toBe(4);
    expect(response.body.stats.overdue).toBe(0);
  });

  it("does not count a task that is late but already done", async () => {
    const id = await taskDueOn(cookieA, "Late but finished", daysAgo(5));

    await request(app)
      .patch(`/api/tasks/${id}`)
      .set("Cookie", cookieA)
      .send({ status: "done" });

    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    // Finishing something late does not leave it hanging over you.
    expect(response.body.stats.overdue).toBe(0);
  });

  it("does not count a task due today as overdue", async () => {
    // Compared against the start of today, not the current moment — the same
    // line createTaskSchema draws for "Due date can't be in the past". A task
    // due at some point today still has today to be done in.
    await request(app)
      .post("/api/tasks")
      .set("Cookie", cookieA)
      .send({ title: "Due today", dueDate: new Date().toISOString() });

    const response = await request(app)
      .get("/api/tasks/stats")
      .set("Cookie", cookieA);

    expect(response.body.stats.total).toBe(1);
    expect(response.body.stats.overdue).toBe(0);
  });
});
