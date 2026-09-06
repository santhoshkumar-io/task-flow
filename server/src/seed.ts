import { env, isProduction } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { hashPassword } from "./lib/password.js";
import { ActivityModel } from "./models/activity.model.js";
import { CommentModel } from "./models/comment.model.js";
import { CounterModel, nextTaskKey } from "./models/counter.model.js";
import { TaskModel, type TaskPriority, type TaskStatus } from "./models/task.model.js";
import { UserModel } from "./models/user.model.js";

// Fills an empty database with something to look at: two people and 25 tasks
// spread across all five statuses and all four priorities.
//
// It DELETES what is already there first. A seed that gives a different result
// depending on what happened to be in the database is not much use to a
// reviewer — running it twice should leave exactly the same 25 tasks, not 50.
//
// THE TASKS HAVE A PAST. The first version of this seed wrote everything with
// today's date: 25 tasks all created in the same second, and 25 "created"
// activity rows, with not one status change between them. That is fine for
// looking at a list and useless for anything that asks "what changed, and
// when" — every window of time before today was empty, so no comparison
// between two periods could say anything.
//
// So creation is spread over the last four weeks, and each task walks its way
// to its final status through real transitions with real dates. Four weeks
// rather than two, because a fortnight of data can only answer "what happened
// recently"; two fortnights can answer "and is that more or less than before".
//
// Everything is derived from the position in the list, not from random
// numbers, so two runs produce exactly the same history.

const DEMO_PASSWORD = "TaskFlow123!";

/** How far back the oldest task was created. See the note above. */
const HISTORY_DAYS = 28;

// Four people. The first three do the work; the fourth deliberately does none.
//
// Priya joined most recently of the three and holds fewer tasks, so the Team
// screen shows a spread rather than two identical rows.
//
// Nina is the "Never active" case: assigned nothing, creator of nothing, no
// activity row anywhere. The Team screen has to show her with real zeros and
// the word Never, and until now that case depended on an account registered by
// hand during testing — which meant it vanished every time the seed ran.
// Roles are seeded across the four so the Team screen shows a spread rather
// than one value repeated. Sarah is the admin, which is what makes "an admin
// may delete anybody's task" demonstrable from a real account.
const demoUsers = [
  { name: "Sarah Chen", email: "sarah@taskflow.dev", role: "admin" as const },
  { name: "Marcus Reid", email: "marcus@taskflow.dev", role: "engineer" as const },
  { name: "Priya Nair", email: "priya@taskflow.dev", role: "designer" as const },
  { name: "Nina Alvarez", email: "nina@taskflow.dev", role: "product_manager" as const },
];

/** The three who actually touch tasks — index 3 is never given anything. */
const ACTIVE_USERS = 3;

// Written out rather than generated at random, so every run produces the same
// list and the exit checks below can name a specific task.
const taskSeeds: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  // 0 = Sarah, 1 = Marcus, 2 = Priya, null = nobody. Never 3 — see demoUsers.
  assignee: 0 | 1 | 2 | null;
  // Days from today. Negative is overdue, null is no date.
  dueInDays: number | null;
}[] = [
  { title: "Fix login bug on Safari", description: "Session cookie is dropped after the first redirect.", status: "in_progress", priority: "urgent", assignee: 0, dueInDays: 1 },
  { title: "Fix payment webhook issue", description: "Stripe retries are being processed twice.", status: "blocked", priority: "urgent", assignee: 1, dueInDays: -2 },
  { title: "Add password reset flow", description: "Email link, one hour expiry.", status: "todo", priority: "high", assignee: 0, dueInDays: 7 },
  { title: "Upgrade to Node 24", description: "Check every dependency for native builds first.", status: "todo", priority: "medium", assignee: null, dueInDays: 30 },
  { title: "Write onboarding docs", description: "Setup steps for a brand new machine.", status: "in_review", priority: "medium", assignee: 1, dueInDays: 4 },
  { title: "Design review for checkout", description: "Second pass on the mobile sheet.", status: "in_review", priority: "high", assignee: 2, dueInDays: 2 },
  { title: "Remove unused feature flags", description: "Six flags have been on for a year.", status: "done", priority: "low", assignee: 1, dueInDays: null },
  { title: "Set up error tracking", description: "Sentry, with source maps uploaded on build.", status: "todo", priority: "high", assignee: null, dueInDays: 10 },
  { title: "Audit third party licences", description: "Legal asked for a list before the release.", status: "todo", priority: "low", assignee: 2, dueInDays: 45 },
  { title: "Speed up the dashboard query", description: "Four seconds on a cold cache.", status: "in_progress", priority: "high", assignee: 0, dueInDays: 3 },
  { title: "Add keyboard shortcuts", description: "At least j, k and Enter on the task list.", status: "todo", priority: "low", assignee: null, dueInDays: null },
  { title: "Migrate logging to structured JSON", description: "So the log viewer can filter properly.", status: "blocked", priority: "medium", assignee: 1, dueInDays: 14 },
  { title: "Fix flaky checkout test", description: "Fails about one run in eight.", status: "in_progress", priority: "medium", assignee: 0, dueInDays: -1 },
  { title: "Review pull request 412", description: "Large refactor of the pricing module.", status: "in_review", priority: "urgent", assignee: 1, dueInDays: 1 },
  { title: "Delete the legacy admin panel", description: "Nobody has opened it since March.", status: "done", priority: "low", assignee: 2, dueInDays: null },
  { title: "Add rate limiting to login", description: "Five attempts per fifteen minutes.", status: "todo", priority: "urgent", assignee: null, dueInDays: 5 },
  { title: "Improve empty states", description: "The task list is bleak with no tasks.", status: "todo", priority: "medium", assignee: 0, dueInDays: 12 },
  { title: "Set up staging environment", description: "Same shape as production, smaller.", status: "in_progress", priority: "high", assignee: 2, dueInDays: 8 },
  { title: "Write the API reference", description: "Every route, with an example body.", status: "todo", priority: "medium", assignee: null, dueInDays: 20 },
  { title: "Fix timezone bug in due dates", description: "Dates shift by a day for anyone east of UTC.", status: "blocked", priority: "high", assignee: 2, dueInDays: -5 },
  { title: "Add avatar upload", description: "Two megabyte cap, square crop.", status: "todo", priority: "low", assignee: 1, dueInDays: null },
  { title: "Reduce bundle size", description: "The main chunk is 900kb before gzip.", status: "in_review", priority: "medium", assignee: null, dueInDays: 18 },
  { title: "Document the release process", description: "Three people have asked this week.", status: "done", priority: "medium", assignee: 2, dueInDays: null },
  { title: "Investigate memory leak in worker", description: "Grows about 40MB an hour under load.", status: "in_progress", priority: "urgent", assignee: 0, dueInDays: 2 },
  { title: "Archive old marketing pages", description: "Twelve pages from the 2024 campaign.", status: "done", priority: "low", assignee: null, dueInDays: null },
  { title: "Add pagination to the audit log", description: "It loads every row and the page hangs past about two thousand.", status: "todo", priority: "medium", assignee: 2, dueInDays: 16 },
  { title: "Replace the CSV export", description: "Quoting breaks on any description containing a comma.", status: "in_progress", priority: "high", assignee: 1, dueInDays: 6 },
  { title: "Cache the user lookup", description: "The assignee dropdown refetches on every screen that opens it.", status: "in_review", priority: "low", assignee: 0, dueInDays: 9 },
  { title: "Retire the v1 auth endpoints", description: "Nothing has called them for two months. Check the access logs first.", status: "done", priority: "medium", assignee: null, dueInDays: null },
  { title: "Add a health check to the deploy", description: "Roll back automatically if the first request after a deploy fails.", status: "todo", priority: "urgent", assignee: null, dueInDays: -3 },
];

function dateFromNow(days: number | null): Date | null {
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

/** A point in the past, to the hour, so ordering inside a day is still stable. */
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/**
 * The route a task took to reach the status it is in now.
 *
 * Nothing arrives in review without having been in progress first, and nothing
 * is blocked before anybody picked it up. Writing the intermediate steps is
 * what makes the activity trail worth reading — and what lets a question like
 * "how many moved to Done in the last week" have an answer at all.
 *
 * Every task starts life as `todo`, so a task that is still `todo` has no
 * transitions and no status_changed rows. That is not a gap in the data; it is
 * the accurate statement that nothing has happened to it yet.
 */
function pathTo(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case "todo":
      return [];
    case "in_progress":
      return ["in_progress"];
    case "blocked":
      return ["in_progress", "blocked"];
    case "in_review":
      return ["in_progress", "in_review"];
    case "done":
      return ["in_progress", "in_review", "done"];
  }
}

/**
 * How much of its life a task spent moving, by position in the list.
 *
 * Without this every task's last transition sits at a fixed fraction of its own
 * age, so everything finishes recently no matter how old it is — the first run
 * of this seed put all five "moved to Done" events inside the last six days and
 * left the fortnight before them completely empty. A comparison between two
 * periods cannot say anything when one of them is empty.
 *
 * A pace of 0.4 means the task did all its moving in the first 40% of its life
 * and has sat still since — someone finished it and moved on. 1.0 means it was
 * still being worked on until recently.
 */
const PACES = [0.4, 0.7, 1] as const;

/**
 * When each of a task's events happened, oldest first.
 *
 * Steps are spaced evenly across the working window — from the moment the task
 * was created, through `pace` of the time between then and now.
 */
function timeline(createdHoursAgo: number, steps: number, pace = 1): Date[] {
  if (steps === 0) return [];

  // steps + 1 gaps, so the last transition sits one gap short of the end of the
  // window rather than exactly on it. Nothing should look like it changed this
  // second.
  const gap = (createdHoursAgo * pace) / (steps + 1);

  return Array.from({ length: steps }, (_, index) =>
    hoursAgo(createdHoursAgo - gap * (index + 1)),
  );
}

async function seed() {
  const forced = process.argv.includes("--force");

  if (isProduction && !forced) {
    console.error(
      "\nRefusing to run: NODE_ENV is production and this deletes every user and task.\n" +
        "Pass --force if that is genuinely what you want.\n",
    );
    process.exit(1);
  }

  await connectDb(env.MONGODB_URI);

  console.log("\nDeleting existing data...");
  const [users, tasks, counters, comments, activity] = await Promise.all([
    UserModel.deleteMany({}),
    TaskModel.deleteMany({}),
    CounterModel.deleteMany({}),
    CommentModel.deleteMany({}),
    ActivityModel.deleteMany({}),
  ]);
  console.log(
    `  removed ${users.deletedCount} users, ${tasks.deletedCount} tasks, ` +
      `${counters.deletedCount} counters, ${comments.deletedCount} comments, ` +
      `${activity.deletedCount} activity`,
  );

  // Hashed once and reused: bcrypt at cost 12 takes about half a second, and
  // both demo accounts share the same password.
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const created = await UserModel.create(
    demoUsers.map((user) => ({ ...user, passwordHash })),
  );
  console.log(`\nCreated ${created.length} users.`);

  // One at a time, on purpose: nextTaskKey() is meant to be safe under
  // simultaneous use, but a seed does not need to prove that, and this way the
  // keys come out in the same order as the list above.
  //
  // Each task is written with the dates it would have had if it had really been
  // made weeks ago and moved along since. `timestamps: false` on the save is
  // what allows that: with timestamps on, Mongoose stamps createdAt and
  // updatedAt with the current time and quietly discards anything set here.
  const createdTasks = [];
  const activityRows: {
    taskId: unknown;
    actorId: unknown;
    type: "created" | "status_changed";
    from: string | null;
    to: string | null;
    createdAt: Date;
  }[] = [];

  for (const [index, item] of taskSeeds.entries()) {
    // Oldest first: task 1 was made four weeks ago, the last one three days
    // ago. Everything is at least a few days old, so nothing looks like it
    // appeared while the reviewer was watching.
    const createdHoursAgo =
      (HISTORY_DAYS - (index / (taskSeeds.length - 1)) * (HISTORY_DAYS - 3)) * 24;

    const steps = pathTo(item.status);
    const moments = timeline(createdHoursAgo, steps.length, PACES[index % PACES.length]);
    const createdAt = hoursAgo(createdHoursAgo);
    // The last thing that happened to it — which is exactly what updatedAt
    // means, and what the task list sorts by out of the box.
    const updatedAt = moments.at(-1) ?? createdAt;

    const task = new TaskModel({
      key: await nextTaskKey(),
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      dueDate: dateFromNow(item.dueInDays),
      assigneeId: item.assignee === null ? null : created[item.assignee]!._id,
      // Rotate the creator through the three active people, so "only the
      // creator may delete" can be demonstrated from any of their accounts.
      // Never the fourth: a created row would make her active.
      creatorId: created[index % ACTIVE_USERS]!._id,
      createdAt,
      updatedAt,
    });

    await task.save({ timestamps: false });
    createdTasks.push(task);

    activityRows.push({
      taskId: task._id,
      actorId: task.creatorId,
      type: "created",
      from: null,
      to: null,
      createdAt,
    });

    // Whoever holds the task is the one moving it along; an unassigned task is
    // moved by the person who made it. Both are more honest than crediting
    // every change to the same account.
    const mover = item.assignee === null ? task.creatorId : created[item.assignee]!._id;

    let previous: TaskStatus = "todo";
    steps.forEach((next, step) => {
      activityRows.push({
        taskId: task._id,
        actorId: mover,
        type: "status_changed",
        from: previous,
        to: next,
        createdAt: moments[step]!,
      });
      previous = next;
    });
  }
  console.log(`Created ${taskSeeds.length} tasks.`);

  // A few real conversations, so the task detail screen in V8 has something to
  // show and is never built against made up data.
  const conversations: [number, [number, string][]][] = [
    [0, [
      [1, "Reproduced on Safari 17. Only happens after the OAuth redirect."],
      [0, "Good catch. It looks like the cookie is being set without SameSite."],
      [1, "Trying a fix now — will push to a branch this afternoon."],
    ]],
    [1, [
      [0, "Stripe support confirmed they retry after 8 seconds if we are slow."],
      [1, "So we need the handler to be idempotent. Blocked until we add the event id check."],
    ]],
    [13, [
      [1, "Left a few notes on the pricing module. Mostly naming."],
    ]],
  ];

  let commentCount = 0;
  for (const [taskIndex, messages] of conversations) {
    const task = createdTasks[taskIndex]!;

    // Spread through the life of the task they belong to. A conversation dated
    // today on a task opened four weeks ago reads as a mistake, and the detail
    // screen shows these in order with a relative time beside each one.
    const openHours = (Date.now() - task.createdAt.getTime()) / (60 * 60 * 1000);
    const moments = timeline(openHours, messages.length);

    for (const [position, [authorIndex, body]] of messages.entries()) {
      const at = moments[position]!;

      const comment = new CommentModel({
        taskId: task._id,
        authorId: created[authorIndex]!._id,
        body,
        createdAt: at,
        updatedAt: at,
      });

      await comment.save({ timestamps: false });
      commentCount += 1;
    }
  }
  console.log(`Created ${commentCount} comments.`);

  // The whole trail at once, gathered while the tasks were being written.
  //
  // `timestamps: false` again, for the same reason: the point of these rows is
  // WHEN they happened, and the default behaviour would stamp all of them with
  // this moment and throw that away.
  await ActivityModel.insertMany(activityRows, { timestamps: false });

  const changes = activityRows.filter((row) => row.type === "status_changed").length;
  console.log(
    `Created ${activityRows.length} activity records ` +
      `(${createdTasks.length} created, ${changes} status changes).\n`,
  );

  const byStatus = await TaskModel.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log("  by status  :", byStatus.map((r) => `${r._id}=${r.count}`).join(" "));

  const byPriority = await TaskModel.aggregate([
    { $group: { _id: "$priority", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log("  by priority:", byPriority.map((r) => `${r._id}=${r.count}`).join(" "));
  console.log("  unassigned :", await TaskModel.countDocuments({ assigneeId: null }));

  // Printed rather than asserted, so a run SHOWS that the history is really
  // there instead of the seed claiming it. Two windows of a fortnight each: if
  // the older one is empty, the spread has silently stopped working.
  const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  console.log("\n  history");
  console.log(
    "    tasks created  : last 14 days =",
    await TaskModel.countDocuments({ createdAt: { $gte: days(14) } }),
    " the 14 before that =",
    await TaskModel.countDocuments({ createdAt: { $gte: days(28), $lt: days(14) } }),
  );
  console.log(
    "    status changes : last 14 days =",
    await ActivityModel.countDocuments({ type: "status_changed", createdAt: { $gte: days(14) } }),
    " the 14 before that =",
    await ActivityModel.countDocuments({ type: "status_changed", createdAt: { $gte: days(28), $lt: days(14) } }),
  );
  console.log(
    "    moved to done  : last 14 days =",
    await ActivityModel.countDocuments({ type: "status_changed", to: "done", createdAt: { $gte: days(14) } }),
    " the 14 before that =",
    await ActivityModel.countDocuments({ type: "status_changed", to: "done", createdAt: { $gte: days(28), $lt: days(14) } }),
  );

  const oldest = await TaskModel.findOne().sort({ createdAt: 1 }).lean();
  const newest = await TaskModel.findOne().sort({ createdAt: -1 }).lean();
  console.log(
    "    span           :",
    oldest?.createdAt.toISOString().slice(0, 10),
    "to",
    newest?.createdAt.toISOString().slice(0, 10),
  );

  console.log("\nSign in with either:");
  for (const user of demoUsers) {
    console.log(`  ${user.email}   ${DEMO_PASSWORD}`);
  }
  console.log("");

  await disconnectDb();
}

seed().catch(async (error) => {
  console.error("\nSeed failed:", error);
  await disconnectDb();
  process.exit(1);
});
