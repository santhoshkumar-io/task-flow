import { env, isProduction } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { hashPassword } from "./lib/password.js";
import { CounterModel, nextTaskKey } from "./models/counter.model.js";
import { TaskModel, type TaskPriority, type TaskStatus } from "./models/task.model.js";
import { UserModel } from "./models/user.model.js";

// Fills an empty database with something to look at: two people and 25 tasks
// spread across all five statuses and all four priorities.
//
// It DELETES what is already there first. A seed that gives a different result
// depending on what happened to be in the database is not much use to a
// reviewer — running it twice should leave exactly the same 25 tasks, not 50.

const DEMO_PASSWORD = "TaskFlow123!";

const demoUsers = [
  { name: "Sarah Chen", email: "sarah@taskflow.dev" },
  { name: "Marcus Reid", email: "marcus@taskflow.dev" },
];

// Written out rather than generated at random, so every run produces the same
// list and the exit checks below can name a specific task.
const taskSeeds: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  // 0 = Sarah, 1 = Marcus, null = nobody
  assignee: 0 | 1 | null;
  // Days from today. Negative is overdue, null is no date.
  dueInDays: number | null;
}[] = [
  { title: "Fix login bug on Safari", description: "Session cookie is dropped after the first redirect.", status: "in_progress", priority: "urgent", assignee: 0, dueInDays: 1 },
  { title: "Fix payment webhook issue", description: "Stripe retries are being processed twice.", status: "blocked", priority: "urgent", assignee: 1, dueInDays: -2 },
  { title: "Add password reset flow", description: "Email link, one hour expiry.", status: "todo", priority: "high", assignee: 0, dueInDays: 7 },
  { title: "Upgrade to Node 24", description: "Check every dependency for native builds first.", status: "todo", priority: "medium", assignee: null, dueInDays: 30 },
  { title: "Write onboarding docs", description: "Setup steps for a brand new machine.", status: "in_review", priority: "medium", assignee: 1, dueInDays: 4 },
  { title: "Design review for checkout", description: "Second pass on the mobile sheet.", status: "in_review", priority: "high", assignee: 0, dueInDays: 2 },
  { title: "Remove unused feature flags", description: "Six flags have been on for a year.", status: "done", priority: "low", assignee: 1, dueInDays: null },
  { title: "Set up error tracking", description: "Sentry, with source maps uploaded on build.", status: "todo", priority: "high", assignee: null, dueInDays: 10 },
  { title: "Audit third party licences", description: "Legal asked for a list before the release.", status: "todo", priority: "low", assignee: 1, dueInDays: 45 },
  { title: "Speed up the dashboard query", description: "Four seconds on a cold cache.", status: "in_progress", priority: "high", assignee: 0, dueInDays: 3 },
  { title: "Add keyboard shortcuts", description: "At least j, k and Enter on the task list.", status: "todo", priority: "low", assignee: null, dueInDays: null },
  { title: "Migrate logging to structured JSON", description: "So the log viewer can filter properly.", status: "blocked", priority: "medium", assignee: 1, dueInDays: 14 },
  { title: "Fix flaky checkout test", description: "Fails about one run in eight.", status: "in_progress", priority: "medium", assignee: 0, dueInDays: -1 },
  { title: "Review pull request 412", description: "Large refactor of the pricing module.", status: "in_review", priority: "urgent", assignee: 1, dueInDays: 1 },
  { title: "Delete the legacy admin panel", description: "Nobody has opened it since March.", status: "done", priority: "low", assignee: 0, dueInDays: null },
  { title: "Add rate limiting to login", description: "Five attempts per fifteen minutes.", status: "todo", priority: "urgent", assignee: null, dueInDays: 5 },
  { title: "Improve empty states", description: "The task list is bleak with no tasks.", status: "todo", priority: "medium", assignee: 0, dueInDays: 12 },
  { title: "Set up staging environment", description: "Same shape as production, smaller.", status: "in_progress", priority: "high", assignee: 1, dueInDays: 8 },
  { title: "Write the API reference", description: "Every route, with an example body.", status: "todo", priority: "medium", assignee: null, dueInDays: 20 },
  { title: "Fix timezone bug in due dates", description: "Dates shift by a day for anyone east of UTC.", status: "blocked", priority: "high", assignee: 0, dueInDays: -5 },
  { title: "Add avatar upload", description: "Two megabyte cap, square crop.", status: "todo", priority: "low", assignee: 1, dueInDays: null },
  { title: "Reduce bundle size", description: "The main chunk is 900kb before gzip.", status: "in_review", priority: "medium", assignee: null, dueInDays: 18 },
  { title: "Document the release process", description: "Three people have asked this week.", status: "done", priority: "medium", assignee: 1, dueInDays: null },
  { title: "Investigate memory leak in worker", description: "Grows about 40MB an hour under load.", status: "in_progress", priority: "urgent", assignee: 0, dueInDays: 2 },
  { title: "Archive old marketing pages", description: "Twelve pages from the 2024 campaign.", status: "done", priority: "low", assignee: null, dueInDays: null },
];

function dateFromNow(days: number | null): Date | null {
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
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

  console.log("\nDeleting existing users, tasks and counters...");
  const [users, tasks, counters] = await Promise.all([
    UserModel.deleteMany({}),
    TaskModel.deleteMany({}),
    CounterModel.deleteMany({}),
  ]);
  console.log(
    `  removed ${users.deletedCount} users, ${tasks.deletedCount} tasks, ${counters.deletedCount} counters`,
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
  for (const item of taskSeeds) {
    await TaskModel.create({
      key: await nextTaskKey(),
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      dueDate: dateFromNow(item.dueInDays),
      assigneeId: item.assignee === null ? null : created[item.assignee]!._id,
      // Alternate the creator so "only the creator may delete" can actually be
      // demonstrated from either account.
      creatorId: created[taskSeeds.indexOf(item) % 2]!._id,
    });
  }
  console.log(`Created ${taskSeeds.length} tasks.\n`);

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
