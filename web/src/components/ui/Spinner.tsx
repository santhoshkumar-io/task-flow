import { cn } from "../../lib/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Announced to screen readers. Set to "" inside a button that already says it. */
  label?: string;
}

const SIZES = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-8 border-[3px]",
} as const;

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        SIZES[size],
        className,
      )}
    />
  );
}
