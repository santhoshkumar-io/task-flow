import { cn } from "../../lib/cn";

interface SkeletonProps {
  className?: string;
}

// The pulse itself lives in index.css as .tf-skeleton, copied verbatim from
// section 8.8 of the design reference.
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("tf-skeleton", className)} />;
}
