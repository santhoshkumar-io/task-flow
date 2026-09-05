import { cn } from "../../lib/cn";
import { initialsOf } from "../../lib/initials";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      // The initials are decoration; the full name is what should be read out.
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-surface font-medium text-ink ring-1 ring-line select-none",
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  );
}
