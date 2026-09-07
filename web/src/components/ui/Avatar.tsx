import { cn } from "../../lib/cn";
import { initialsOf } from "../../lib/initials";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  /**
   * `accent` marks THIS avatar as the signed-in person.
   *
   * The design tints only your own initials, and only where the avatar stands
   * for you: the top bar, the sidebar, the comment box you are typing in, and
   * your own row on the Team screen. Everybody else stays neutral — if every
   * avatar were blue the tint would say nothing at all.
   */
  tone?: "neutral" | "accent";
  className?: string;
}

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

// The design draws your own avatar FLAT and BOLD: no ring, heavier letters, and
// a deeper blue than the plain accent token. The depth is not decoration —
// --color-accent on a pale accent fill is 3.1:1, which fails AA at these sizes.
// See index.css.
//
// Everybody else keeps the hairline ring and medium weight, so the tint reads
// as "this one is you" rather than as four different avatar styles.
const TONES = {
  neutral: "bg-surface text-ink font-medium ring-1 ring-line",
  accent: "bg-accent-soft text-accent-strong font-bold ring-0",
} as const;

export function Avatar({
  name,
  size = "md",
  tone = "neutral",
  className,
}: AvatarProps) {
  return (
    <span
      // The initials are decoration; the full name is what should be read out.
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "select-none",
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  );
}
