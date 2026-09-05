import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/cn";

// Label, big number, icon in the corner. Nothing under the number.
//
// The design draws a TREND there — "+12% since last week" — and V9 step 1 asks
// for one. There is nothing to compute it from: no snapshot of yesterday's
// counts exists, and the activity trail holds no status changes at all.
//
// A second line carrying a real figure instead — a share of the total, an
// overdue count — was built and then taken back out in review. The card is the
// label, the number and the icon.
// See docs/decisions/0015-stat-cards-without-a-trend-line.md.
//
// The icon is a plain category icon — a list, a clock, a tick — and never an
// up-arrow. An arrow pointing up is itself a claim about a direction that
// nothing here has measured.

interface StatCardProps {
  label: string;
  /** Undefined until the API answers. Nothing is drawn before then. */
  value: number | undefined;
  icon: ReactNode;
  tone?: "neutral" | "accent" | "warning" | "success";
  /** When set, the whole card is a link to that filtered task list. */
  to?: string;
}

const TONES = {
  neutral: "bg-status-todo-bg text-muted",
  accent: "bg-status-progress-bg text-accent",
  warning: "bg-status-review-bg text-warning",
  success: "bg-status-done-bg text-success",
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  to,
}: StatCardProps) {
  const card = (
    <Card
      padding="sm"
      className={cn(
        "h-full",
        // Only when it goes somewhere. A card that lifts on hover but does
        // nothing is the "visible control that silently does nothing" that
        // AGENTS.md calls the worst option.
        to && "transition-colors group-hover:border-ink/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
            TONES[tone],
          )}
        >
          {icon}
        </span>
      </div>

      {value === undefined ? (
        // A grey block, not a zero. A zero would read as a real count saying
        // there is no work — AGENTS.md forbids a number that did not come from
        // a response, and that includes a placeholder.
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em] text-ink">
          {value}
        </p>
      )}
    </Card>
  );

  if (!to) return card;

  // The destination does not depend on the number, so the card is a link from
  // the first paint rather than becoming one when the data lands. A control
  // that appears late is a control people click through.
  return (
    <Link
      to={to}
      // The same focus treatment TaskCard already uses, so a card is a card
      // wherever you meet one.
      className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    >
      {card}
    </Link>
  );
}

const ICON = "size-4 fill-none stroke-current stroke-[1.5]";

export function StackIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2 2 5l6 3 6-3z" />
      <path d="M2 8.5 8 11.5l6-3M2 11.5 8 14.5l6-3" />
    </svg>
  );
}

export function InboxIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2 9.5h3l1 1.5h4l1-1.5h3" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

export function TickIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="m5.5 8 1.8 1.8L10.5 6.5" />
    </svg>
  );
}
