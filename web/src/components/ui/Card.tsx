import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

export function Card({ padding = "md", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-white shadow-xs",
        PADDING[padding],
        className,
      )}
      {...rest}
    />
  );
}
