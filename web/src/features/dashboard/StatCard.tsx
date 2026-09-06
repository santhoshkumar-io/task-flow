import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/cn";

// Label, big number, a second line, and a category icon in the corner.
//
// THE SECOND LINE HAS A SOURCE OR IT IS NOT DRAWN. V9 removed it because the
// database held no history at all — 25 tasks created in the same second and not
// one status change — so every version of it would have been invented. The seed
// now carries four weeks of real movement, so each line is a query.
// See docs/decisions/0022-dashboard-cards-match-the-design.md.

interface StatCardProps {
  label: string;
  /** Undefined until the API answers. Nothing is drawn before then. */
  value: number | undefined;
  icon: ReactNode;
  /** The small line under the number. Undefined draws nothing. */
  hint?: ReactNode;
  /** When set, the whole card is a link to that filtered task list. */
  to?: string;
}

export function StatCard({ label, value, icon, hint, to }: StatCardProps) {
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
        {/* Bare, as the design draws it — no tinted tile behind it. The tile
            also carried the only status colour on these cards; without it the
            four icons read as one row of headings rather than four moods. */}
        <span aria-hidden="true" className="shrink-0 text-ink">
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

      {/* The hint follows the same rule as the number: a grey block while the
          answer is in flight, never a guess at what it will say. */}
      {hint !== undefined &&
        (value === undefined ? (
          <Skeleton className="mt-2 h-3 w-28" />
        ) : (
          <div className="mt-2 text-xs">{hint}</div>
        ))}
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

/**
 * The design's "+8% vs last week".
 *
 * Drawn ONLY when the previous period had something in it. A rise from zero is
 * not a percentage — it is a division by zero wearing a plus sign — and the
 * oldest week in the data can legitimately be empty. In that case the card
 * falls back to the plain count, which is still true.
 */
export function Trend({
  current,
  previous,
  fallback,
}: {
  current: number | undefined;
  previous: number | undefined;
  fallback: string;
}) {
  if (current === undefined || previous === undefined) return null;

  if (previous === 0) {
    return <span className="text-muted">{fallback}</span>;
  }

  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;

  // Only the figure carries the colour; "vs last week" stays muted, as the
  // design draws it. Colouring the whole sentence red makes the words look like
  // part of the warning rather than the period being compared.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        up ? "text-success" : "text-destructive",
      )}
    >
      <Arrow className="size-4" aria-hidden="true" />
      <span>
        <span className="font-medium">
          {up ? "+" : ""}
          {change}%
        </span>{" "}
        <span className="text-muted">vs last week</span>
      </span>
    </span>
  );
}

/**
 * The design's "+5 this week" — a count that went UP over a period, drawn green
 * with a rising arrow.
 *
 * Zero is drawn muted and without the arrow. "+0 this week" in green under a
 * rising arrow would claim something improved when nothing did.
 */
export function Gain({
  value,
  suffix,
}: {
  value: number | undefined;
  suffix: string;
}) {
  if (value === undefined) return null;

  if (value === 0) {
    return (
      <span className="text-muted">
        +0 {suffix}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-success">
      <TrendingUp className="size-4" aria-hidden="true" />
      <span>
        <span className="font-medium">+{value}</span>{" "}
        <span className="text-muted">{suffix}</span>
      </span>
    </span>
  );
}

/** A plain count with wording around it. Muted, because it claims no direction. */
export function Note({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}
