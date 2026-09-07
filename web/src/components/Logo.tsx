import { cn } from "../lib/cn";

interface LogoProps {
  size?: "sm" | "md";
  /** Show the wordmark beside the mark. */
  withText?: boolean;
  className?: string;
}

export function Logo({ size = "md", withText = true, className }: LogoProps) {
  const box = size === "sm" ? "size-6 text-xs" : "size-8 text-sm";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-ink font-bold text-white",
          box,
        )}
      >
        T
      </span>
      {withText && (
        <span className="font-heading text-base font-semibold tracking-tight">
          TaskFlow
        </span>
      )}
    </span>
  );
}
