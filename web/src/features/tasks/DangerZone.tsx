import { Button } from "../../components/ui/Button";

// The pale red card at the bottom of the edit rail — section 6.
//
// Rendered only for the creator. Anyone else does not see it, because the
// server would answer 404 and a button that always fails is worse than no
// button. The 404 is still the real guard.

export function DangerZone({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-status-blocked-bg p-4">
      <h2 className="font-heading text-sm font-semibold text-destructive">
        Danger zone
      </h2>

      <p className="mt-1 text-xs text-ink">
        Deleting a task removes its comments and activity. This can't be undone.
      </p>

      <Button
        variant="destructive-outline"
        size="sm"
        onClick={onDelete}
        className="mt-3"
      >
        Delete task
      </Button>
    </div>
  );
}
