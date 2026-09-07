// Turning the server's ISO strings into what the design shows.
//
// Every function here takes the date and returns a string on the spot. None of
// these results is ever put in state: "2h ago" saved once is wrong an hour
// later, and nothing would re-render to correct it. Formatting at render time
// means the value is right whenever the screen is drawn.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Aug 12" — the Created column. */
export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** "12 August 2026 at 09:41" — for a title attribute on a short date. */
export function formatFullDate(value: string | Date): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

/**
 * "just now", "5m ago", "2h ago", "Yesterday", "3d ago", then a real date.
 *
 * Past about a week, "23d ago" stops being useful — nobody counts back from
 * today — so it becomes "Aug 12" and stays readable.
 */
export function formatRelative(value: string | Date): string {
  const then = new Date(value).getTime();
  const elapsed = Date.now() - then;

  // A clock a few seconds behind the server would otherwise produce
  // "in 4 seconds" on a task that was just created.
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return formatShortDate(value);
}

/**
 * True when a due date has passed.
 *
 * Compared against the START of today, not the current moment, so a task due
 * "today" is not overdue at 09:00 and fine at 08:59. This matches the rule the
 * server enforces in task.schema.ts.
 */
export function isOverdue(value: string | Date | null | undefined): boolean {
  if (!value) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return new Date(value).getTime() < startOfToday.getTime();
}
