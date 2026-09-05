import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "destructive";

interface BadgeProps {
  tone?: BadgeTone;
  /** Show the coloured dot before the label. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

// The pale backgrounds come from the tokens in index.css. Nothing here knows
// what a status is — the screen that uses this decides which tone a status maps
// to. That is what keeps this component free of the app.
const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  neutral: { chip: "bg-status-todo-bg text-ink border-line", dot: "bg-muted" },
  accent: {
    chip: "bg-status-progress-bg text-ink border-accent/20",
    dot: "bg-accent",
  },
  warning: {
    chip: "bg-status-review-bg text-ink border-warning/20",
    dot: "bg-warning",
  },
  success: {
    chip: "bg-status-done-bg text-ink border-success/20",
    dot: "bg-success",
  },
  destructive: {
    chip: "bg-status-blocked-bg text-ink border-destructive/20",
    dot: "bg-destructive",
  },
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: BadgeProps) {
  const styles = TONES[tone];

  return (
    <span
      className={cn(
        // 22px tall, 6px radius, label at 12/500 — section 8.7.
        "inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2",
        "text-xs font-medium whitespace-nowrap",
        styles.chip,
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
        />
      )}
      {children}
    </span>
  );
}
