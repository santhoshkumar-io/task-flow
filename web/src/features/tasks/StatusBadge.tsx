import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { STATUS_LABELS, type TaskStatus } from "../../types";

// The mapping from a status to a colour lives HERE, not in Badge. Badge knows
// about five tones and nothing about tasks, which is what lets components/ui/
// be lifted into another project unchanged. See docs/notes/v6.md.
//
// Colours are section 8.2 of the design reference.
const TONES: Record<TaskStatus, BadgeTone> = {
  todo: "neutral",
  in_progress: "accent",
  in_review: "warning",
  done: "success",
  blocked: "destructive",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge tone={TONES[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
